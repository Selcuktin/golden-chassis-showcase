import { createRemoteJWKSet, jwtVerify } from "jose";

export type CloudflareAccessEnv = {
  CF_ACCESS_REQUIRED?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  CF_ACCESS_ALLOWED_EMAILS?: string;
};

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function requiresAccess(request: Request): boolean {
  // Match the decoded route used by the router, including encoded slashes.
  const path = decodeURIComponent(new URL(request.url).pathname)
    .replace(/\/{2,}/g, "/")
    .toLowerCase();
  if (path === "/admin" || path.startsWith("/admin/")) return true;
  if (path === "/api/admin" || path.startsWith("/api/admin/")) return true;
  if (path !== "/api/cms") return false;
  // Public catalog reads share a URL with privileged writes/draft reads. An
  // Access rule for all of /api/cms would also hide the public showroom.
  return (
    request.method !== "GET" ||
    request.headers.has("authorization") ||
    request.headers.has("x-admin-token")
  );
}

function denied(status: number, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function enforceCloudflareAccess(
  request: Request,
  env: CloudflareAccessEnv,
): Promise<Response | null> {
  if (env.CF_ACCESS_REQUIRED === "false") return null;
  const configured =
    env.CF_ACCESS_REQUIRED === "true" ||
    Boolean(env.CF_ACCESS_TEAM_DOMAIN || env.CF_ACCESS_AUD || env.CF_ACCESS_ALLOWED_EMAILS);
  if (!configured) return null;
  try {
    if (!requiresAccess(request)) return null;
  } catch {
    return denied(400, "Geçersiz istek yolu.");
  }

  let issuer: string;
  const audience = env.CF_ACCESS_AUD?.trim() || "";
  const emails = new Set(
    (env.CF_ACCESS_ALLOWED_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  try {
    const team = new URL(env.CF_ACCESS_TEAM_DOMAIN || "");
    if (
      team.protocol !== "https:" ||
      !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team.hostname) ||
      team.pathname !== "/" ||
      team.search ||
      team.hash ||
      team.username ||
      team.password ||
      team.port ||
      !audience ||
      emails.size === 0
    ) {
      throw new Error("Incomplete Access configuration");
    }
    issuer = team.origin;
  } catch {
    return denied(503, "Yönetici erişim yapılandırması tamamlanmamış.");
  }

  // Access adds the assertion on protected paths. CMS writes instead use the
  // same host's HttpOnly Access cookie because the public GET route stays open.
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("CF_Authorization="))
    ?.slice("CF_Authorization=".length);
  const token = request.headers.get("cf-access-jwt-assertion") || cookie;
  if (!token) return denied(401, "Cloudflare Access girişi gerekiyor.");

  try {
    let keys = keySets.get(issuer);
    if (!keys) {
      keys = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", issuer), {
        timeoutDuration: 5000,
      });
      keySets.set(issuer, keys);
    }
    // Verification is delegated to jose; never trust the email header or decode
    // a JWT without checking its signature, issuer, audience and lifetime.
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience,
      algorithms: ["RS256"],
      requiredClaims: ["sub", "email", "iat", "exp"],
      clockTolerance: 5,
    });
    if (typeof payload["email"] !== "string" || !emails.has(payload["email"].toLowerCase())) {
      return denied(403, "Bu hesap için yönetici erişimi tanımlı değil.");
    }
    return null;
  } catch {
    return denied(401, "Cloudflare Access oturumu doğrulanamadı. Yeniden giriş yapın.");
  }
}
