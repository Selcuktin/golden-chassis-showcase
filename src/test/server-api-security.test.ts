import { describe, expect, it } from "vitest";
import { BUILD_GIT_COMMIT, handleApiRequest } from "@/server/api";

describe("Server API, D1 Security & Stability Engine", () => {
  it("GET /api/health returns operational status, version, and commit metadata", async () => {
    const req = new Request("https://bycarglobal.com/api/health", { method: "GET" });
    const res = await handleApiRequest(req, {});
    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);

    const body = (await res?.json()) as {
      status: string;
      version: string;
      commit: string;
      d1: boolean;
      timestamp: string;
    };
    expect(body.status).toBe("ok");
    expect(body.version).toBe("1.0.0-production");
    expect(body.commit).toBe(BUILD_GIT_COMMIT);
    expect(typeof body.d1).toBe("boolean");
  });

  it("POST /api/admin/login enforces 5-attempt brute-force rate limiting with 429 lockout", async () => {
    // 4 wrong attempts
    for (let i = 0; i < 4; i++) {
      const req = new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "192.0.2.10" },
        body: JSON.stringify({ password: `wrong-${i}` }),
      });
      const res = await handleApiRequest(req, {});
      expect(res?.status).toBe(401);
    }

    // 5th wrong attempt triggers lock
    const req5 = new Request("https://bycarglobal.com/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "192.0.2.10" },
      body: JSON.stringify({ password: "wrong-final" }),
    });
    const res5 = await handleApiRequest(req5, {});
    expect(res5?.status).toBe(401);
    const body5 = (await res5?.json()) as { ok: boolean; error: string };
    expect(body5.error).toContain("kilitlendi");

    // 6th attempt is blocked with 429
    const req6 = new Request("https://bycarglobal.com/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "192.0.2.10" },
      body: JSON.stringify({ password: "bybycar1453" }),
    });
    const res6 = await handleApiRequest(req6, {});
    expect(res6?.status).toBe(429);
  });

  it("POST /api/admin/login authenticates with valid credentials and issues secure token", async () => {
    const req = new Request("https://bycarglobal.com/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.5" },
      body: JSON.stringify({ password: "bybycar1453" }),
    });
    const res = await handleApiRequest(req, {});
    expect(res?.status).toBe(200);

    const body = (await res?.json()) as { ok: boolean; token: string; expiresAt: string };
    expect(body.ok).toBe(true);
    expect(body.token).toMatch(/^bycar_sec_/);

    // Verify GET /api/admin/me with issued token
    const meReq = new Request("https://bycarglobal.com/api/admin/me", {
      method: "GET",
      headers: { authorization: `Bearer ${body.token}` },
    });
    const meRes = await handleApiRequest(meReq, {});
    expect(meRes?.status).toBe(200);
    const meBody = (await meRes?.json()) as { ok: boolean; authenticated: boolean };
    expect(meBody.ok).toBe(true);
    expect(meBody.authenticated).toBe(true);
  });

  it("GET /api/admin/me rejects unauthorized request with 401", async () => {
    const unauthedReq = new Request("https://bycarglobal.com/api/admin/me", { method: "GET" });
    const res = await handleApiRequest(unauthedReq, {});
    expect(res?.status).toBe(401);
  });

  it("GET /api/cms filters out draft vehicles for public visitors and returns active/sold only", async () => {
    const req = new Request("https://bycarglobal.com/api/cms", { method: "GET" });
    const res = await handleApiRequest(req, {});
    expect(res?.status).toBe(200);

    const body = (await res?.json()) as {
      ok: boolean;
      cars: Array<{ status?: string }>;
    };
    expect(body.ok).toBe(true);
    if (Array.isArray(body.cars)) {
      for (const car of body.cars) {
        expect(car.status).not.toBe("draft");
      }
    }
  });

  it("POST /api/cms validates vehicle payload with Zod and rejects invalid data with 400", async () => {
    // 1. Login to get token
    const loginReq = new Request("https://bycarglobal.com/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.1" },
      body: JSON.stringify({ password: "bybycar1453" }),
    });
    const loginRes = await handleApiRequest(loginReq, {});
    const loginData = (await loginRes?.json()) as { token: string };

    // 2. Submit invalid payload (invalid year < 1900)
    const badPayloadReq = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${loginData.token}`,
      },
      body: JSON.stringify({
        cars: [
          {
            id: "invalid-car",
            brand: "Audi",
            title: "RS6",
            year: 1850, // Invalid: year must be >= 1900
            km: -50, // Invalid: km must be >= 0
            fuel: "Benzin",
            gear: "Otomatik",
            body: "Avant",
          },
        ],
      }),
    });

    const badRes = await handleApiRequest(badPayloadReq, {});
    expect(badRes?.status).toBe(400);
    const badData = (await badRes?.json()) as { ok: boolean; error: string };
    expect(badData.ok).toBe(false);
    expect(badData.error).toContain("Veri doğrulama hatası");
  });

  it("POST /api/admin/inquiries/status validates status parameter with Zod", async () => {
    const loginReq = new Request("https://bycarglobal.com/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.2" },
      body: JSON.stringify({ password: "bybycar1453" }),
    });
    const loginRes = await handleApiRequest(loginReq, {});
    const loginData = (await loginRes?.json()) as { token: string };

    // Send invalid status string
    const badStatusReq = new Request("https://bycarglobal.com/api/admin/inquiries/status", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${loginData.token}`,
      },
      body: JSON.stringify({ id: "inq-1", status: "BilinmeyenDurum" }),
    });

    const badRes = await handleApiRequest(badStatusReq, {});
    expect(badRes?.status).toBe(400);
  });

  it("GET /sitemap.xml dynamically generates compliant sitemap XML with priority and changefreq", async () => {
    const req = new Request("https://bycarglobal.com/sitemap.xml", { method: "GET" });
    const res = await handleApiRequest(req, { SITE_URL: "https://bycarglobal.com" });
    expect(res?.status).toBe(200);
    expect(res?.headers.get("content-type")).toContain("application/xml");

    const text = await res?.text();
    expect(text).toContain("<urlset");
    expect(text).toContain("<loc>https://bycarglobal.com/</loc>");
    expect(text).toContain("<priority>1.0</priority>");
  });

  it("POST /api/admin/upload enforces authentication, MIME whitelist, magic bytes, and fail-closed storage", async () => {
    // 1. Unauthenticated upload -> 401
    const unauthedReq = new Request("https://bycarglobal.com/api/admin/upload", {
      method: "POST",
      headers: { "content-type": "image/webp" },
      body: new Uint8Array([1, 2, 3]),
    });
    const unauthedRes = await handleApiRequest(unauthedReq, {});
    expect(unauthedRes?.status).toBe(401);

    // 2. Login to get token
    const loginReq = new Request("https://bycarglobal.com/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.99" },
      body: JSON.stringify({ password: "bybycar1453" }),
    });
    const loginRes = await handleApiRequest(loginReq, {});
    const loginData = (await loginRes?.json()) as { token: string };

    // 3. Invalid MIME type (e.g. application/pdf) -> 400
    const badMimeReq = new Request("https://bycarglobal.com/api/admin/upload", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/pdf",
      },
      body: new Uint8Array([1, 2, 3]),
    });
    const badMimeRes = await handleApiRequest(badMimeReq, {});
    expect(badMimeRes?.status).toBe(400);
    const badMimeData = (await badMimeRes?.json()) as { ok: boolean; error: string };
    expect(badMimeData.error).toContain("Desteklenmeyen dosya türü");

    // 4. Invalid magic bytes (e.g. random text pretending to be webp) -> 400
    const fakeWebpReq = new Request("https://bycarglobal.com/api/admin/upload", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "image/webp",
      },
      body: new TextEncoder().encode("Hello this is not an image at all"),
    });
    const fakeWebpRes = await handleApiRequest(fakeWebpReq, {});
    expect(fakeWebpRes?.status).toBe(400);
    const fakeWebpData = (await fakeWebpRes?.json()) as { ok: boolean; error: string };
    expect(fakeWebpData.error).toContain("Geçersiz dosya içeriği");

    // 5. Valid WebP bytes but BUCKET unconfigured -> 503 (Fail-closed)
    // Valid minimal WebP header: 'RIFF' + 4 bytes + 'WEBP'
    const validWebpBytes = new Uint8Array([
      0x52,
      0x49,
      0x46,
      0x46, // RIFF
      0x10,
      0x00,
      0x00,
      0x00, // size
      0x57,
      0x45,
      0x42,
      0x50, // WEBP
      0x56,
      0x50,
      0x38,
      0x20, // VP8_
    ]);
    const noBucketReq = new Request("https://bycarglobal.com/api/admin/upload", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "image/webp",
      },
      body: validWebpBytes,
    });
    const noBucketRes = await handleApiRequest(noBucketReq, {});
    expect(noBucketRes?.status).toBe(503);
    const noBucketData = (await noBucketRes?.json()) as { ok: boolean; error: string };
    expect(noBucketData.error).toContain("BUCKET");

    // 6. Valid WebP bytes with mock BUCKET -> 200
    let savedKey = "";
    const mockBucket = {
      put: async (key: string) => {
        savedKey = key;
        return {};
      },
      get: async () => null,
      delete: async () => {},
    };
    const bucketReq = new Request("https://bycarglobal.com/api/admin/upload", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "image/webp",
        "x-vehicle-id": "test-car",
        "x-file-name": "photo.webp",
      },
      body: validWebpBytes,
    });
    const bucketRes = await handleApiRequest(bucketReq, { BUCKET: mockBucket });
    expect(bucketRes?.status).toBe(200);
    const bucketData = (await bucketRes?.json()) as { ok: boolean; url: string; r2Key: string };
    expect(bucketData.ok).toBe(true);
    expect(bucketData.url).toContain("/api/media/");
    expect(savedKey).toContain("vehicles/test-car/");
  });
});
