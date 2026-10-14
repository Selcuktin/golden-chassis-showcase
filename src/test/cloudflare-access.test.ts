// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { enforceCloudflareAccess, type CloudflareAccessEnv } from "../server/cloudflare-access";
import { handleApiRequest } from "../server/api";

const issuer = "https://bycar-test.cloudflareaccess.com";
const env: CloudflareAccessEnv = {
  CF_ACCESS_REQUIRED: "true",
  CF_ACCESS_TEAM_DOMAIN: issuer,
  CF_ACCESS_AUD: "bycar-admin-test",
  CF_ACCESS_ALLOWED_EMAILS: "owner@example.com",
};
let privateKey: CryptoKey;
let attackerKey: CryptoKey;
let fetchKeys: ReturnType<typeof vi.fn>;

async function token(overrides: Record<string, unknown> = {}, key = privateKey) {
  return new SignJWT({ email: "owner@example.com", ...overrides })
    .setProtectedHeader({ alg: "RS256", kid: "bycar-key" })
    .setSubject("access-user")
    .setIssuer(issuer)
    .setAudience("bycar-admin-test")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}
const request = (path: string, headers: HeadersInit = {}, method = "GET") =>
  new Request(`https://bycar.example${path}`, { method, headers });

beforeAll(async () => {
  const keys = await generateKeyPair("RS256", { extractable: true });
  privateKey = keys.privateKey;
  attackerKey = (await generateKeyPair("RS256")).privateKey;
  const jwk = { ...(await exportJWK(keys.publicKey)), kid: "bycar-key", alg: "RS256", use: "sig" };
  fetchKeys = vi.fn(async (url: string | URL | Request) => {
    if (String(url).includes("offline-test")) throw new Error("Synthetic JWKS outage");
    expect(String(url)).toBe(`${issuer}/cdn-cgi/access/certs`);
    return new Response(JSON.stringify({ keys: [jwk] }), {
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchKeys);
});
afterAll(() => vi.unstubAllGlobals());

describe("Cloudflare Access boundary with actual jose signature verification", () => {
  it("supports a staged rollout when no Access configuration is present", async () => {
    expect(await enforceCloudflareAccess(request("/admin"), {})).toBeNull();
  });

  it.each([
    ["/admin", "GET", {}],
    ["/admin/", "GET", {}],
    ["/AdMiN", "GET", {}],
    ["/%61dmin", "GET", {}],
    ["/api/admin/login", "POST", {}],
    ["/api%2fadmin/me", "GET", {}],
    ["/api/cms", "POST", {}],
    ["/api/cms", "GET", { authorization: "Bearer stolen-app-session" }],
    ["/api/cms", "GET", { "x-admin-token": "stolen-app-session" }],
  ] as const)(
    "requires Access for %s %s even with an existing app token",
    async (path, method, headers) => {
      const response = await enforceCloudflareAccess(request(path, headers, method), env);
      expect(response?.status).toBe(401);
      expect(response?.headers.get("cache-control")).toBe("no-store");
    },
  );

  it.each(["/", "/api/cms", "/api/media/vehicles/test.png", "/sitemap.xml", "/api/health"])(
    "leaves public GET %s accessible",
    async (path) => {
      expect(await enforceCloudflareAccess(request(path), env)).toBeNull();
    },
  );

  it("leaves customer inquiries public", async () => {
    expect(await enforceCloudflareAccess(request("/api/inquiry", {}, "POST"), env)).toBeNull();
  });

  it.each([
    { CF_ACCESS_REQUIRED: "true" },
    { ...env, CF_ACCESS_AUD: "" },
    { ...env, CF_ACCESS_ALLOWED_EMAILS: "" },
    { ...env, CF_ACCESS_TEAM_DOMAIN: "http://bycar-test.cloudflareaccess.com" },
    { ...env, CF_ACCESS_TEAM_DOMAIN: "https://attacker.example" },
    { ...env, CF_ACCESS_TEAM_DOMAIN: `${issuer}/unexpected-path` },
  ])("denies protected requests when configuration is incomplete or unsafe", async (config) => {
    expect((await enforceCloudflareAccess(request("/api/cms", {}, "POST"), config))?.status).toBe(
      503,
    );
    expect(await enforceCloudflareAccess(request("/api/cms"), config)).toBeNull();
  });

  it("verifies a real signed assertion and normalizes the configured email", async () => {
    const jwt = await token();
    expect(
      await enforceCloudflareAccess(request("/api/admin/me", { "cf-access-jwt-assertion": jwt }), {
        ...env,
        CF_ACCESS_ALLOWED_EMAILS: " Owner@Example.com ",
      }),
    ).toBeNull();
    expect(fetchKeys).toHaveBeenCalled();
  });

  it("verifies the Access cookie for CMS writes outside the edge-protected path", async () => {
    expect(
      await enforceCloudflareAccess(
        request(
          "/api/cms",
          { cookie: `other=value; CF_Authorization=${await token()}; last=value` },
          "POST",
        ),
        env,
      ),
    ).toBeNull();
  });

  it("rejects a signed identity outside the allow list", async () => {
    expect(
      (
        await enforceCloudflareAccess(
          request("/admin", {
            "cf-access-jwt-assertion": await token({ email: "someone@example.com" }),
          }),
          env,
        )
      )?.status,
    ).toBe(403);
  });

  it("rejects forged signatures and spoofed email headers", async () => {
    expect(
      (
        await enforceCloudflareAccess(
          request("/admin", {
            "cf-access-jwt-assertion": await token({}, attackerKey),
            "cf-access-authenticated-user-email": "owner@example.com",
          }),
          env,
        )
      )?.status,
    ).toBe(401);
    expect(
      (
        await enforceCloudflareAccess(
          request("/admin", { "cf-access-authenticated-user-email": "owner@example.com" }),
          env,
        )
      )?.status,
    ).toBe(401);
  });

  it.each(["issuer", "audience", "expiry", "missing-expiry"])(
    "rejects an invalid JWT %s",
    async (scenario) => {
      const builder = new SignJWT({ email: "owner@example.com" })
        .setProtectedHeader({ alg: "RS256", kid: "bycar-key" })
        .setSubject("access-user")
        .setIssuedAt()
        .setIssuer(scenario === "issuer" ? "https://wrong.cloudflareaccess.com" : issuer)
        .setAudience(scenario === "audience" ? "wrong-audience" : "bycar-admin-test");
      if (scenario !== "missing-expiry")
        builder.setExpirationTime(
          scenario === "expiry" ? Math.floor(Date.now() / 1000) - 60 : "1h",
        );
      expect(
        (
          await enforceCloudflareAccess(
            request("/admin", { "cf-access-jwt-assertion": await builder.sign(privateKey) }),
            env,
          )
        )?.status,
      ).toBe(401);
    },
  );

  it("denies access during a JWKS outage", async () => {
    expect(
      (
        await enforceCloudflareAccess(
          request("/admin", { "cf-access-jwt-assertion": await token() }),
          { ...env, CF_ACCESS_TEAM_DOMAIN: "https://offline-test.cloudflareaccess.com" },
        )
      )?.status,
    ).toBe(401);
  });

  it("runs before login/password checks and before the admin page renderer", async () => {
    const configuredEnv = { ...env, ADMIN_PASSWORD: "SyntheticPassword!2026" };
    const response = await handleApiRequest(
      new Request("https://bycar.example/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password: configuredEnv.ADMIN_PASSWORD }),
        headers: { "content-type": "application/json" },
      }),
      configuredEnv,
    );
    expect(response?.status).toBe(401);
    expect((await handleApiRequest(request("/admin"), configuredEnv))?.status).toBe(401);
    expect(
      (await handleApiRequest(request("/admin"), { CF_ACCESS_REQUIRED: "true" }))?.status,
    ).toBe(503);
  });
});
