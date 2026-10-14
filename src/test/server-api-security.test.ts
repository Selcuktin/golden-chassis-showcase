import { beforeEach, describe, expect, it } from "vitest";
import { BUILD_GIT_COMMIT, handleApiRequest, resetRateLimitsForTesting } from "@/server/api";
import serverWorker from "@/server";

const TEST_ADMIN_PASSWORD = "test-secret-env-password-2026-safe!";
(globalThis as unknown as { __env__?: Record<string, unknown> }).__env__ = {
  ADMIN_PASSWORD: TEST_ADMIN_PASSWORD,
};

describe("Server API, D1 Security & Stability Engine", () => {
  beforeEach(() => {
    resetRateLimitsForTesting();
  });
  it("rejects production API use without D1 even when email verification is disabled", async () => {
    for (const path of ["/api/admin/login", "/api/cms", "/api/inquiry"]) {
      const res = await handleApiRequest(
        new Request(`https://bycar.example${path}`, {
          method: path === "/api/cms" ? "GET" : "POST",
        }),
        {
          NODE_ENV: "production",
          CF_ACCESS_REQUIRED: "false",
          ADMIN_PASSWORD: TEST_ADMIN_PASSWORD,
        },
      );
      expect(res?.status).toBe(503);
    }
  });
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
      body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
    });
    const res6 = await handleApiRequest(req6, {});
    expect(res6?.status).toBe(429);
  });

  it("POST /api/admin/login authenticates with valid credentials and issues secure token", async () => {
    const req = new Request("https://bycarglobal.com/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.5" },
      body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
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
      body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
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
      body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
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
      body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
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

  it("POST /api/cms preserves non-present vehicles and safely deletes only explicit deletedCarIds", async () => {
    // 1. Login to obtain admin token
    const loginReq = new Request("https://bycarglobal.com/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.99" },
      body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
    });
    const loginRes = await handleApiRequest(loginReq, {});
    const loginData = (await loginRes?.json()) as { token: string };

    const initialCars = [
      {
        id: "car-preserve-1",
        brand: "Ferrari",
        title: "Ferrari 296 GTB",
        year: 2024,
        km: 500,
        fuel: "Hibrit",
        gear: "Otomatik",
        body: "Coupe",
        status: "active" as const,
        featured: false,
        imageFit: "cover" as const,
        images: ["/cars/ferrari/1.jpg"],
        specs: {
          power: "830 HP",
          color: "Rosso Corsa",
          package: "Assetto",
          expertise: "Orijinal",
          tramer: "Yok",
        },
        extras: [],
        extrasEn: [],
        description: { tr: "Test", en: "Test" },
      },
      {
        id: "car-preserve-2",
        brand: "McLaren",
        title: "McLaren 750S",
        year: 2024,
        km: 200,
        fuel: "Benzin",
        gear: "Otomatik",
        body: "Coupe",
        status: "active" as const,
        featured: false,
        imageFit: "cover" as const,
        images: ["/cars/mclaren/1.jpg"],
        specs: {
          power: "750 HP",
          color: "Orange",
          package: "Performance",
          expertise: "Orijinal",
          tramer: "Yok",
        },
        extras: [],
        extrasEn: [],
        description: { tr: "Test", en: "Test" },
      },
    ];

    // Seed cars into catalog
    const seedReq = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ cars: initialCars, revision: 1 }),
    });
    const seedRes = await handleApiRequest(seedReq, {});
    expect(seedRes?.status).toBe(200);

    // Stale sync that only sends Ferrari (omits McLaren, but does NOT specify deletedCarIds)
    const staleReq = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ cars: [initialCars[0]], revision: 2 }),
    });
    const staleRes = await handleApiRequest(staleReq, {});
    expect(staleRes?.status).toBe(200);

    // Read back: McLaren MUST still exist in memory catalog (not wiped by stale sync)
    const readReq = new Request("https://bycarglobal.com/api/cms", {
      method: "GET",
      headers: { authorization: `Bearer ${loginData.token}` },
    });
    const readRes = await handleApiRequest(readReq, {});
    const readData = (await readRes?.json()) as { cars: Array<{ id: string }> };
    expect(readData.cars.some((c) => c.id === "car-preserve-2")).toBe(true);

    // Now explicitly delete McLaren with deletedCarIds
    const deleteReq = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ deletedCarIds: ["car-preserve-2"], revision: 3 }),
    });
    const deleteRes = await handleApiRequest(deleteReq, {});
    expect(deleteRes?.status).toBe(200);

    // Read back: McLaren is now deleted
    const readAfterDeleteRes = await handleApiRequest(readReq, {});
    const readAfterDeleteData = (await readAfterDeleteRes?.json()) as {
      cars: Array<{ id: string }>;
    };
    expect(readAfterDeleteData.cars.some((c) => c.id === "car-preserve-2")).toBe(false);
    expect(readAfterDeleteData.cars.some((c) => c.id === "car-preserve-1")).toBe(true);
  });

  it("POST /api/cms preserves memoryStore unchanged if D1 database transaction fails", async () => {
    const loginReq = new Request("https://bycarglobal.com/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.11" },
      body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
    });
    const loginRes = await handleApiRequest(loginReq, {});
    const loginData = (await loginRes?.json()) as { token: string };

    // Mock failing D1 database where batch throws an error
    const failingDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
          all: async () => ({ results: [], success: true }),
          first: async () => null,
        }),
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () => null,
      }),
      batch: async () => {
        throw new Error("D1_MOCK_STORAGE_DISK_FULL");
      },
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const failingReq = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        revision: 1,
        cars: [
          {
            id: "car-should-never-be-saved",
            brand: "Bugatti",
            title: "Bugatti Tourbillon",
            year: 2026,
            km: 0,
            fuel: "Hibrit",
            gear: "Otomatik",
            body: "Coupe",
            status: "active" as const,
            featured: true,
            imageFit: "cover" as const,
            images: [],
            specs: {
              power: "1800 HP",
              color: "Blue",
              package: "Tourbillon",
              expertise: "Orijinal",
              tramer: "Yok",
            },
            extras: [],
            extrasEn: [],
            description: { tr: "Test", en: "Test" },
          },
        ],
      }),
    });

    const res = await handleApiRequest(failingReq, { DB: failingDb });
    expect(res?.status).toBe(500);

    // Verify memoryStore was NOT mutated by the failed request
    const afterRead = await handleApiRequest(
      new Request("https://bycarglobal.com/api/cms", {
        headers: { authorization: `Bearer ${loginData.token}` },
      }),
      {},
    );
    const afterData = (await afterRead?.json()) as { cars: Array<{ id: string }> };
    expect(afterData.cars.some((c) => c.id === "car-should-never-be-saved")).toBe(false);
  });

  it("Regression Test 3a: Rejects oversized deletedCarIds (>500 items) with 400 Bad Request", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const massiveDeletedIds = Array.from({ length: 501 }, (_, i) => `car-del-${i}`);
    const req = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        deletedCarIds: massiveDeletedIds,
      }),
    });

    const res = await handleApiRequest(req, {});
    expect(res?.status).toBe(400);
    const body = (await res?.json()) as { ok: boolean; error: string };
    expect(body.error).toContain("deletedCarIds");
  });

  it("Regression Test 3b: Optimistic Concurrency Control returns 409 Conflict if client revision is stale", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const staleReq = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        revision: 0,
        settings: { test: true },
      }),
    });

    const res = await handleApiRequest(staleReq, {});
    expect(res?.status).toBe(409);
    const body = (await res?.json()) as { ok: boolean; conflict: boolean; error: string };
    expect(body.conflict).toBe(true);
    expect(body.error).toContain("Çakışma tespit edildi");
  });

  it("Regression Test 3c: large catalogs use one atomic D1 batch and queue orphan media", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const batchCalls: unknown[][] = [];
    const deletedR2Keys: string[] = [];

    const mockDb = {
      prepare: (sql: string) => ({
        bind: (..._args: unknown[]) => ({
          run: async () => ({ success: true }),
          all: async () => {
            if (sql.includes("FROM vehicle_images WHERE vehicle_id IN")) {
              return {
                results: [
                  {
                    id: "img-orphan-1",
                    vehicle_id: "car-del-1",
                    r2_key: "vehicles/car-del-1/1",
                    public_url: "/api/media/vehicles%2Fcar-del-1%2F1",
                  },
                ],
                success: true,
              };
            }
            return { results: [], success: true };
          },
          first: async () => {
            if (sql.includes("cms_revision")) {
              return { value: "1" };
            }
            return null;
          },
        }),
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () => null,
      }),
      batch: async (stmts: unknown[]) => {
        batchCalls.push(stmts);
        return stmts.map(() => ({ success: true }));
      },
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const mockBucket = {
      put: async () => ({}),
      get: async () => null,
      delete: async (key: string) => {
        deletedR2Keys.push(key);
      },
    };

    // A large catalog must remain one transaction even when each record has several images.
    const cars = Array.from({ length: 35 }, (_, i) => ({
      id: `car-chunk-${i}`,
      brand: "BMW",
      title: `BMW M4 #${i}`,
      year: 2024,
      km: 1000,
      fuel: "Benzin",
      gear: "Otomatik",
      body: "Coupe",
      status: "active" as const,
      featured: false,
      imageFit: "cover" as const,
      images: [
        `/api/media/vehicles%2Fcar-chunk-${i}%2F1`,
        `/api/media/vehicles%2Fcar-chunk-${i}%2F2`,
        `/api/media/vehicles%2Fcar-chunk-${i}%2F3`,
      ],
      specs: {
        power: "510 HP",
        color: "Siyah",
        package: "Competition",
        expertise: "Orijinal",
        tramer: "Yok",
      },
      extras: [],
      extrasEn: [],
      description: { tr: "", en: "" },
    }));

    const req = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        cars,
        deletedCarIds: ["car-del-1"],
        revision: 1,
      }),
    });

    const res = await handleApiRequest(req, { DB: mockDb, BUCKET: mockBucket });
    expect(res?.status).toBe(200);

    // The revision guard must cover every catalog mutation in the same transaction.
    expect(batchCalls).toHaveLength(1);
    expect(batchCalls[0]!.length).toBeLessThan(30);

    // Assert that orphaned R2 key was deleted
    expect(deletedR2Keys).not.toContain("vehicles/car-del-1/1");
  });

  it("Regression Test 3d: Shared media asset is preserved and NOT deleted from R2 if another vehicle references it", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const deletedR2Keys: string[] = [];

    const mockDb = {
      prepare: (sql: string) => ({
        bind: (..._args: unknown[]) => ({
          run: async () => ({ success: true }),
          all: async () => {
            if (sql.includes("FROM vehicle_images WHERE vehicle_id IN")) {
              return {
                results: [
                  {
                    id: "img-shared-1",
                    vehicle_id: "car-to-delete",
                    r2_key: "vehicles/shared/hero.webp",
                    public_url: "/api/media/vehicles%2Fshared%2Fhero.webp",
                  },
                ],
                success: true,
              };
            }
            return { results: [], success: true };
          },
          first: async () => {
            if (sql.includes("cms_revision")) {
              return { value: "1" };
            }
            if (sql.includes("COUNT(*) as count FROM vehicle_images")) {
              // Simulate that another vehicle is STILL referencing this image
              return { count: 1 };
            }
            return null;
          },
        }),
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () => null,
      }),
      batch: async (stmts: unknown[]) => stmts.map(() => ({ success: true })),
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const mockBucket = {
      put: async () => ({}),
      get: async () => null,
      delete: async (key: string) => {
        deletedR2Keys.push(key);
      },
    };

    const req = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        deletedCarIds: ["car-to-delete"],
        revision: 1,
      }),
    });

    const res = await handleApiRequest(req, { DB: mockDb, BUCKET: mockBucket });
    expect(res?.status).toBe(200);

    // Assert that the shared key was PRESERVED and NOT deleted
    expect(deletedR2Keys).not.toContain("vehicles/shared/hero.webp");
  });

  it("Regression Test 3e: Atomic CAS check rejects update with 409 if revision changed right before batch", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    let checkCount = 0;
    const getRevision = async () => {
      checkCount++;
      return { value: checkCount === 1 ? "1" : "2" };
    };
    const mockDb = {
      prepare: (sql: string) => ({
        bind: (..._args: unknown[]) => ({
          run: async () => ({ success: true }),
          all: async () => ({ results: [], success: true }),
          first: async () => (sql.includes("cms_revision") ? getRevision() : null),
        }),
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () => (sql.includes("cms_revision") ? getRevision() : null),
      }),
      batch: async (stmts: unknown[]) => stmts.map(() => ({ success: true })),
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const req = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        settings: { name: "Test Showcase" },
        revision: 1,
      }),
    });

    const res = await handleApiRequest(req, { DB: mockDb });
    expect(res?.status).toBe(409);
    const data = (await res?.json()) as { ok: boolean; conflict: boolean };
    expect(data.conflict).toBe(true);
  });

  it("Regression Test 3f: Multi-row image insert keeps a 15-car catalog in a single atomic batch transaction", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const batchCalls: unknown[][] = [];
    const mockDb = {
      prepare: (sql: string) => ({
        bind: (..._args: unknown[]) => ({
          run: async () => ({ success: true }),
          all: async () => ({ results: [], success: true }),
          first: async () => (sql.includes("cms_revision") ? { value: "1" } : null),
        }),
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () => (sql.includes("cms_revision") ? { value: "1" } : null),
      }),
      batch: async (stmts: unknown[]) => {
        batchCalls.push(stmts);
        return stmts.map(() => ({ success: true }));
      },
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const cars = Array.from({ length: 15 }, (_, i) => ({
      id: `car-atomic-${i}`,
      brand: "Porsche",
      title: `911 GT3 #${i}`,
      year: 2024,
      km: 500,
      fuel: "Benzin",
      gear: "PDK",
      body: "Coupe",
      status: "active" as const,
      featured: true,
      imageFit: "cover" as const,
      images: [
        `/api/media/vehicles%2Fcar-atomic-${i}%2F1`,
        `/api/media/vehicles%2Fcar-atomic-${i}%2F2`,
        `/api/media/vehicles%2Fcar-atomic-${i}%2F3`,
        `/api/media/vehicles%2Fcar-atomic-${i}%2F4`,
      ],
      specs: {
        power: "510 HP",
        color: "Gri",
        package: "ClubSport",
        expertise: "Orijinal",
        tramer: "Yok",
      },
      extras: [],
      extrasEn: [],
      description: { tr: "", en: "" },
    }));

    const req = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ cars, revision: 1 }),
    });

    const res = await handleApiRequest(req, { DB: mockDb });
    expect(res?.status).toBe(200);

    // Multi-row compaction ensures 15 vehicles with 4 images each fit in exactly 1 atomic batch!
    expect(batchCalls.length).toBe(1);
    expect(batchCalls[0]?.length).toBeLessThanOrEqual(50);
  });

  it("Regression Test 3g: SQL-level atomic CAS batch rollback intercepts NOT NULL constraint on site_settings.key", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const mockDb = {
      prepare: (sql: string) => ({
        bind: (..._args: unknown[]) => ({
          run: async () => ({ success: true }),
          all: async () => ({ results: [], success: true }),
          first: async () => (sql.includes("cms_revision") ? { value: "1" } : null),
        }),
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () => (sql.includes("cms_revision") ? { value: "1" } : null),
      }),
      batch: async () => {
        // Simulate SQLite transaction failure due to in-batch CAS evaluation producing NULL for primary key
        throw new Error("D1_ERROR: NOT NULL constraint failed: site_settings.key");
      },
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const req = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ settings: { title: "Conflict Test" }, revision: 1 }),
    });

    const res = await handleApiRequest(req, { DB: mockDb });
    expect(res?.status).toBe(409);
    const data = (await res?.json()) as { ok: boolean; conflict: boolean; error: string };
    expect(data.conflict).toBe(true);
    expect(data.error).toContain("Çakışma tespit edildi");
  });

  it("Regression Test 3h: POST /api/admin/media/gc retries queued orphan deletes and protects shared media", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const deletedFromBucket: string[] = [];
    const queueDeletedIds: string[] = [];

    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          run: async () => {
            if (sql.includes("DELETE FROM r2_cleanup_queue WHERE id = ?")) {
              queueDeletedIds.push(String(args[0]));
            }
            return { success: true };
          },
          all: async () => ({ results: [], success: true }),
          first: async () => {
            if (sql.includes("COUNT(*) as count FROM vehicle_images")) {
              // args[0] is the r2_key
              if (args[0] === "vehicles/in-use/pic.webp") {
                return { count: 1 }; // Still in use!
              }
              return { count: 0 }; // Orphaned!
            }
            if (sql.includes("COUNT(*) as count FROM r2_cleanup_queue")) {
              return { count: 0 };
            }
            return null;
          },
        }),
        run: async () => ({ success: true }),
        all: async () => {
          if (sql.includes("FROM r2_cleanup_queue ORDER BY created_at ASC")) {
            return {
              results: [
                { id: "queue-1", r2_key: "vehicles/orphan-1/pic.webp", attempts: 1 },
                { id: "queue-2", r2_key: "vehicles/in-use/pic.webp", attempts: 1 },
              ],
              success: true,
            };
          }
          return { results: [], success: true };
        },
        first: async () =>
          sql.includes("cms_config") || sql.includes("SELECT id FROM r2_cleanup_queue")
            ? null
            : { count: 0 },
      }),
      batch: async (stmts: unknown[]) => stmts.map(() => ({ success: true })),
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const mockBucket = {
      put: async () => ({}),
      get: async () => null,
      delete: async (key: string) => {
        deletedFromBucket.push(key);
      },
    };

    // 1. Unauthorized call returns 401
    const unauthedReq = new Request("https://bycarglobal.com/api/admin/media/gc", {
      method: "POST",
    });
    const unauthedRes = await handleApiRequest(unauthedReq, { DB: mockDb, BUCKET: mockBucket });
    expect(unauthedRes?.status).toBe(401);

    // 2. Authorized call processes cleanup queue
    const authedReq = new Request("https://bycarglobal.com/api/admin/media/gc", {
      method: "POST",
      headers: { authorization: `Bearer ${loginData.token}` },
    });
    const res = await handleApiRequest(authedReq, { DB: mockDb, BUCKET: mockBucket });
    expect(res?.status).toBe(200);

    const body = (await res?.json()) as {
      ok: boolean;
      processed: number;
      deleted: number;
      skippedInUse: number;
    };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(2);
    expect(body.deleted).toBe(1);
    expect(body.skippedInUse).toBe(1);

    // Assert that orphan was deleted from bucket, but in-use media was preserved
    expect(deletedFromBucket).toContain("vehicles/orphan-1/pic.webp");
    expect(deletedFromBucket).not.toContain("vehicles/in-use/pic.webp");

    // Both queue items should be cleared (orphan because deleted, in-use because preserved)
    expect(queueDeletedIds).toContain("queue-1");
    expect(queueDeletedIds).toContain("queue-2");
  });

  it("Regression Test 4a: Rejects malformed JSON body across all endpoints with 400 Bad Request instead of 500", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    // 1. Malformed JSON on /api/cms
    const badCmsReq = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: "INVALID_JSON_BODY{{{",
    });
    const cmsRes = await handleApiRequest(badCmsReq, {});
    expect(cmsRes?.status).toBe(400);
    const cmsBody = (await cmsRes?.json()) as { ok: boolean; error: string };
    expect(cmsBody.error).toContain("Geçersiz JSON formatı");

    // 2. Malformed JSON on /api/inquiry
    const badInquiryReq = new Request("https://bycarglobal.com/api/inquiry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ broken: json ]",
    });
    const inquiryRes = await handleApiRequest(badInquiryReq, {});
    expect(inquiryRes?.status).toBe(400);

    // 3. Malformed JSON on /api/admin/login
    const badLoginReq = new Request("https://bycarglobal.com/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "NOT_JSON",
    });
    const badLoginRes = await handleApiRequest(badLoginReq, {});
    expect(badLoginRes?.status).toBe(400);
  });

  it("Regression Test 4b: Enforces mandatory revision in POST /api/cms (rejects missing revision unless force: true)", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    // Missing revision without force: true -> 400 Bad Request
    const noRevReq = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ settings: { title: "Test" } }),
    });
    const noRevRes = await handleApiRequest(noRevReq, {});
    expect(noRevRes?.status).toBe(400);
    const noRevData = (await noRevRes?.json()) as { ok: boolean; error: string };
    expect(noRevData.error).toContain("revision");

    // Explicit force: true with required forceExpectedRevision and forceReason allows authorized bypass
    const cmsGet = await handleApiRequest(
      new Request("https://bycarglobal.com/api/cms", {
        headers: { authorization: `Bearer ${loginData.token}` },
      }),
      {},
    );
    const cmsData = (await cmsGet?.json()) as { revision?: number };
    const currentRev = cmsData.revision || 1;

    const forceReq = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        settings: { title: "Force Override" },
        force: true,
        forceExpectedRevision: currentRev,
        forceReason: "Emergency maintenance override",
      }),
    });
    const forceRes = await handleApiRequest(forceReq, {});
    expect(forceRes?.status).toBe(200);
  });

  it("Regression Test 4c: POST /api/admin/media/gc scans R2 bucket objects with BUCKET.list and deletes historical orphans", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const deletedR2Keys: string[] = [];
    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          run: async () => ({ success: true }),
          all: async () => ({ results: [], success: true }),
          first: async () => {
            if (sql.includes("COUNT(*) as count FROM vehicle_images")) {
              if (args[0] === "vehicles/active-car/hero.webp") {
                return { count: 1 }; // Still in use!
              }
              return { count: 0 }; // Historical orphan!
            }
            if (sql.includes("COUNT(*) as count FROM r2_cleanup_queue")) {
              return { count: 0 };
            }
            return null;
          },
        }),
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () =>
          sql.includes("cms_config") || sql.includes("SELECT id FROM r2_cleanup_queue")
            ? null
            : { count: 0 },
      }),
      batch: async (stmts: unknown[]) => stmts.map(() => ({ success: true })),
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const mockBucket = {
      put: async () => ({}),
      get: async () => null,
      delete: async (key: string) => {
        deletedR2Keys.push(key);
      },
      list: async () => ({
        objects: [
          { key: "vehicles/active-car/hero.webp", size: 1024 },
          { key: "vehicles/historical-orphan/old.webp", size: 2048 },
        ],
        truncated: false,
      }),
    };

    const gcReq = new Request("https://bycarglobal.com/api/admin/media/gc", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ mode: "scan" }),
    });

    const gcRes = await handleApiRequest(gcReq, { DB: mockDb, BUCKET: mockBucket });
    expect(gcRes?.status).toBe(200);

    const gcBody = (await gcRes?.json()) as {
      ok: boolean;
      bucketScan: { scanned: number; historicalDeleted: number; activeRetained: number };
    };
    expect(gcBody.ok).toBe(true);
    expect(gcBody.bucketScan.scanned).toBe(2);
    expect(gcBody.bucketScan.historicalDeleted).toBe(1);
    expect(gcBody.bucketScan.activeRetained).toBe(1);

    expect(deletedR2Keys).toContain("vehicles/historical-orphan/old.webp");
    expect(deletedR2Keys).not.toContain("vehicles/active-car/hero.webp");
  });

  it("Regression Test 4d: deletedCarIds parameter chunking ensures statements never exceed 40 variables", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const batchStatements: string[] = [];
    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => {
          // Verify that NO statement receives more than 40 bound parameters
          expect(args.length).toBeLessThanOrEqual(40);
          return {
            run: async () => ({ success: true }),
            all: async () => ({ results: [], success: true }),
            first: async () => (sql.includes("cms_revision") ? { value: "1" } : null),
          };
        },
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () => (sql.includes("cms_revision") ? { value: "1" } : null),
      }),
      batch: async (stmts: unknown[]) => {
        batchStatements.push(`batch_of_${stmts.length}`);
        return stmts.map(() => ({ success: true }));
      },
      exec: async () => ({ count: 0, duration: 0 }),
    };

    // 100 deleted car IDs
    const deletedCarIds = Array.from({ length: 100 }, (_, i) => `bulk-del-${i}`);

    const req = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ deletedCarIds, revision: 1 }),
    });

    const res = await handleApiRequest(req, { DB: mockDb });
    expect(res?.status).toBe(200);
    expect(batchStatements.length).toBeGreaterThanOrEqual(1);
  });

  it("Regression Test 5a: POST /api/admin/media/gc with malformed JSON body returns 400 Bad Request", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const mockDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
          all: async () => ({ results: [], success: true }),
          first: async () => null,
        }),
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () => null,
      }),
      batch: async (stmts: unknown[]) => stmts.map(() => ({ success: true })),
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const req = new Request("https://bycarglobal.com/api/admin/media/gc", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: '{"mode": "scan", malformed_json',
    });

    const res = await handleApiRequest(req, { DB: mockDb });
    expect(res?.status).toBe(400);

    const body = (await res?.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain("Geçersiz JSON formatı");
  });

  it("Regression Test 5b: POST /api/admin/media/gc autoDrain loops across multiple pages and drains orphans", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const deletedKeys: string[] = [];
    let listCallCount = 0;

    const mockDb = {
      prepare: (sql: string) => ({
        bind: () => ({
          run: async () => ({ success: true }),
          all: async () => ({ results: [], success: true }),
          first: async () => {
            if (sql.includes("COUNT(*) as count FROM vehicle_images")) {
              return { count: 0 }; // All objects are historical orphans
            }
            return null;
          },
        }),
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () =>
          sql.includes("cms_config") || sql.includes("SELECT id FROM r2_cleanup_queue")
            ? null
            : { count: 0 },
      }),
      batch: async (stmts: unknown[]) => stmts.map(() => ({ success: true })),
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const mockBucket = {
      put: async () => ({}),
      get: async () => null,
      delete: async (key: string) => {
        deletedKeys.push(key);
      },
      list: async (opts: { cursor?: string }) => {
        listCallCount++;
        if (!opts.cursor) {
          // Page 1
          return {
            objects: [{ key: "vehicles/orphan-p1.webp" }],
            truncated: true,
            cursor: "cursor-page-2",
          };
        }
        // Page 2 (last page)
        return {
          objects: [{ key: "vehicles/orphan-p2.webp" }],
          truncated: false,
          cursor: undefined,
        };
      },
    };

    const req = new Request("https://bycarglobal.com/api/admin/media/gc", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ mode: "scan", autoDrain: true }),
    });

    const res = await handleApiRequest(req, { DB: mockDb, BUCKET: mockBucket });
    expect(res?.status).toBe(200);

    const body = (await res?.json()) as {
      ok: boolean;
      bucketScan: {
        scanned: number;
        historicalDeleted: number;
        pagesProcessed: number;
        truncated: boolean;
      };
    };
    expect(body.ok).toBe(true);
    expect(listCallCount).toBe(2);
    expect(body.bucketScan.pagesProcessed).toBe(2);
    expect(body.bucketScan.scanned).toBe(2);
    expect(body.bucketScan.historicalDeleted).toBe(2);
    expect(body.bucketScan.truncated).toBe(false);
    expect(deletedKeys).toEqual(["vehicles/orphan-p1.webp", "vehicles/orphan-p2.webp"]);
  });

  it("Regression Test 5c: POST /api/admin/media/gc enqueues failed orphan deletes into r2_cleanup_queue", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const enqueuedKeys: string[] = [];

    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => {
          if (sql.includes("INSERT INTO r2_cleanup_queue")) {
            enqueuedKeys.push(String(args[1]));
          }
          return {
            run: async () => ({ success: true }),
            all: async () => ({ results: [], success: true }),
            first: async () => {
              if (sql.includes("COUNT(*) as count FROM vehicle_images")) {
                return { count: 0 }; // Orphan
              }
              return null;
            },
          };
        },
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () =>
          sql.includes("cms_config") || sql.includes("SELECT id FROM r2_cleanup_queue")
            ? null
            : { count: 0 },
      }),
      batch: async (stmts: unknown[]) => stmts.map(() => ({ success: true })),
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const mockBucket = {
      put: async () => ({}),
      get: async () => null,
      delete: async () => {
        throw new Error("R2_TRANSIENT_TIMEOUT_503");
      },
      list: async () => ({
        objects: [{ key: "vehicles/transient-fail.webp" }],
        truncated: false,
      }),
    };

    const req = new Request("https://bycarglobal.com/api/admin/media/gc", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ mode: "scan", autoDrain: false }),
    });

    const res = await handleApiRequest(req, { DB: mockDb, BUCKET: mockBucket });
    expect(res?.status).toBe(200);
    expect(enqueuedKeys).toContain("vehicles/transient-fail.webp");
  });

  it("Regression Test 5d: POST /api/cms rejects deletedCarIds exceeding 100 items with 400 Bad Request", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    // 101 deleted car IDs (exceeds 100 cap)
    const deletedCarIds = Array.from({ length: 101 }, (_, i) => `excess-del-${i}`);

    const req = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ deletedCarIds, revision: 1 }),
    });

    const res = await handleApiRequest(req, {});
    expect(res?.status).toBe(400);

    const body = (await res?.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain("deletedCarIds");
  });

  it("Regression Test 5e: POST /api/cms with force: true bypasses revision conflict and writes last_force_sync audit", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const insertedSettings: Record<string, string> = {};

    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => {
          if (sql.includes("INSERT INTO site_settings")) {
            if (sql.includes("'last_force_sync'")) {
              insertedSettings["last_force_sync"] = String(args[0]);
            }
          }
          return {
            run: async () => ({ success: true }),
            all: async () => ({ results: [], success: true }),
            first: async () => {
              if (sql.includes("cms_revision")) {
                return { value: "42" }; // Current revision is 42
              }
              return null;
            },
          };
        },
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () => (sql.includes("cms_revision") ? { value: "42" } : null),
      }),
      batch: async (stmts: unknown[]) => stmts.map(() => ({ success: true })),
      exec: async () => ({ count: 0, duration: 0 }),
    };

    // Client sends outdated revision 10, BUT provides force: true with matching forceExpectedRevision
    const req = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.195",
      },
      body: JSON.stringify({
        revision: 10,
        force: true,
        forceExpectedRevision: 42,
        forceReason: "Acil vitrin guncellemesi",
        settings: { phone: "+90 532 000 00 00" },
      }),
    });

    const res = await handleApiRequest(req, { DB: mockDb });
    expect(res?.status).toBe(200);

    const body = (await res?.json()) as { ok: boolean; revision: number };
    expect(body.ok).toBe(true);
    expect(body.revision).toBe(43);

    // Verify audit record was inserted
    expect(insertedSettings["last_force_sync"]).toBeDefined();
    const audit = JSON.parse(insertedSettings["last_force_sync"]!) as {
      ip: string;
      clientRevision: number;
      previousRevision: number;
      forceExpectedRevision: number;
      forceReason: string;
      forcedAt: string;
    };
    expect(audit.ip).toBe("203.0.113.195");
    expect(audit.clientRevision).toBe(10);
    expect(audit.previousRevision).toBe(42);
    expect(audit.forceExpectedRevision).toBe(42);
    expect(audit.forceReason).toBe("Acil vitrin guncellemesi");
    expect(audit.forcedAt).toBeDefined();
  });

  it("Regression Test 5f: Server response enforces strict CSP with exact Google Fonts origins, connect-src self, and no unsafe-eval", async () => {
    const res = await serverWorker.fetch(
      new Request("https://bycarglobal.com/api/health", { method: "GET" }),
      {},
      {},
    );
    expect(res.status).toBe(200);

    const csp = res.headers.get("content-security-policy");
    expect(csp).toBeTruthy();
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;");
    expect(csp).toContain("font-src 'self' data: https://fonts.gstatic.com;");
    expect(csp).toContain("connect-src 'self';");
    expect(csp).not.toContain("connect-src 'self' https:;");
    expect(csp).not.toContain("style-src 'self' 'unsafe-inline' https:;");
    expect(csp).not.toContain("font-src 'self' data: https:;");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it("Regression Test 6a: Historical GC respects 24-hour grace period and protects freshly uploaded media", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const deletedKeys: string[] = [];
    const nowMs = Date.now();

    const mockDb = {
      prepare: (sql: string) => ({
        bind: () => ({
          run: async () => ({ success: true }),
          all: async () => ({ results: [], success: true }),
          first: async () =>
            sql.includes("cms_config") || sql.includes("SELECT id FROM r2_cleanup_queue")
              ? null
              : { count: 0 },
        }),
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () =>
          sql.includes("cms_config") || sql.includes("SELECT id FROM r2_cleanup_queue")
            ? null
            : { count: 0 },
      }),
      batch: async (stmts: unknown[]) => stmts.map(() => ({ success: true })),
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const mockBucket = {
      put: async () => ({}),
      get: async () => null,
      delete: async (key: string) => {
        deletedKeys.push(key);
      },
      list: async () => ({
        objects: [
          // Freshly uploaded 10 minutes ago (within 24h grace period)
          {
            key: `vehicles/draft-car/${nowMs - 10 * 60 * 1000}-fresh.webp`,
            uploaded: new Date(nowMs - 10 * 60 * 1000),
          },
          // Old orphan uploaded 48 hours ago (outside grace period)
          {
            key: `vehicles/old-car/${nowMs - 48 * 3600 * 1000}-abandoned.webp`,
            uploaded: new Date(nowMs - 48 * 3600 * 1000),
          },
        ],
        truncated: false,
      }),
    };

    const req = new Request("https://bycarglobal.com/api/admin/media/gc", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ mode: "scan" }),
    });

    const res = await handleApiRequest(req, { DB: mockDb, BUCKET: mockBucket });
    expect(res?.status).toBe(200);

    const body = (await res?.json()) as {
      ok: boolean;
      bucketScan: { scanned: number; historicalDeleted: number; activeRetained: number };
    };
    expect(body.ok).toBe(true);
    expect(body.bucketScan.scanned).toBe(2);
    expect(body.bucketScan.historicalDeleted).toBe(1);
    expect(body.bucketScan.activeRetained).toBe(1); // Fresh upload was retained by grace period!
    expect(deletedKeys).toContain(`vehicles/old-car/${nowMs - 48 * 3600 * 1000}-abandoned.webp`);
    expect(deletedKeys).not.toContain(`vehicles/draft-car/${nowMs - 10 * 60 * 1000}-fresh.webp`);
  });

  it("Regression Test 6b: POST /api/cms rejects stale force: true when forceExpectedRevision mismatches", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const mockDb = {
      prepare: (sql: string) => ({
        bind: () => ({
          run: async () => ({ success: true }),
          all: async () => ({ results: [], success: true }),
          first: async () => (sql.includes("cms_revision") ? { value: "50" } : null),
        }),
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () => (sql.includes("cms_revision") ? { value: "50" } : null),
      }),
      batch: async (stmts: unknown[]) => stmts.map(() => ({ success: true })),
      exec: async () => ({ count: 0, duration: 0 }),
    };

    // Stale client attempts force sync expecting revision 45, but current revision in D1 is 50
    const req = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        force: true,
        forceExpectedRevision: 45,
        forceReason: "Stale attempt",
        settings: { title: "Stale Override" },
      }),
    });

    const res = await handleApiRequest(req, { DB: mockDb });
    expect(res?.status).toBe(409);

    const body = (await res?.json()) as { ok: boolean; conflict: boolean; currentRevision: number };
    expect(body.ok).toBe(false);
    expect(body.conflict).toBe(true);
    expect(body.currentRevision).toBe(50);
  });

  it("Regression Test 6c: POST /api/cms rejects payload with more than 35 vehicles to guarantee single-batch ACID atomicity", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    // 36 vehicles (exceeds 35 cap)
    const excessCars = Array.from({ length: 36 }, (_, i) => ({
      id: `car-limit-${i}`,
      brand: "Mercedes-Benz",
      title: `G 63 AMG #${i}`,
      year: 2024,
      km: 1000,
      fuel: "Benzin",
      gear: "Otomatik",
      body: "SUV",
      specs: {},
      imageFit: "cover",
      images: [],
      extras: [],
      extrasEn: [],
      description: { tr: "", en: "" },
      status: "active",
      featured: false,
    }));

    const req = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ cars: excessCars, revision: 1 }),
    });

    const res = await handleApiRequest(req, {});
    expect(res?.status).toBe(400);

    const body = (await res?.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain("cars");
  });

  it("Regression Test 7: Rejects unauthorized passwords when not in env or D1 (bootstrap backdoor closed)", async () => {
    const origEnv = (globalThis as unknown as { __env__?: Record<string, unknown> }).__env__;
    (globalThis as unknown as { __env__?: Record<string, unknown> }).__env__ = {};

    const req = new Request("https://bycarglobal.com/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.99" },
      body: JSON.stringify({ password: "revoked-legacy-test-credential" }),
    });
    const res = await handleApiRequest(req, {});
    expect(res?.status).toBe(401);

    (globalThis as unknown as { __env__?: Record<string, unknown> }).__env__ = origEnv ?? {};
  });

  it("Regression Test 8: Public GET /api/cms never leaks customPasswordHash or admin credentials", async () => {
    const req = new Request("https://bycarglobal.com/api/cms", { method: "GET" });
    const res = await handleApiRequest(req, {});
    expect(res?.status).toBe(200);
    const bodyText = await res?.text();
    expect(bodyText).not.toContain("customPasswordHash");
    expect(bodyText).not.toContain("password_hash");
    expect(bodyText).not.toContain("681f0b5b");
  });

  it("Regression Test 9: Decode URI Error on /api/media/* safely returns 400 instead of crashing", async () => {
    const req = new Request("https://bycarglobal.com/api/media/%E0%A4%A", { method: "GET" });
    const res = await handleApiRequest(req, {});
    expect(res?.status).toBe(400);
  });

  it("Regression Test 10: Inquiry with non-existent vehicleId safely handles FK without 500 error", async () => {
    const req = new Request("https://bycarglobal.com/api/inquiry", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.77" },
      body: JSON.stringify({
        car: "Porsche 911 GT3 RS",
        name: "Test Customer",
        phone: "+905551234567",
        offerOrBudget: "250000 EUR",
        vehicleId: "non-existent-uuid-12345",
      }),
    });
    const res = await handleApiRequest(req, {});
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as { ok: boolean; inquiryId: string };
    expect(body.ok).toBe(true);
    expect(body.inquiryId).toMatch(/^inq-/);
  });

  it("Regression Test 11: CSRF check rejects cross-origin localhost spoofing with 403", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.88" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const req = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
        origin: "https://localhost.evil.com",
      },
      body: JSON.stringify({ cars: [], revision: 1 }),
    });

    const res = await handleApiRequest(req, {});
    expect(res?.status).toBe(403);
  });

  it("Regression Test 12: D1 session revocation authoritatively invalidates token and deletes isolate memory session", async () => {
    const d1Sessions = new Map<string, { id: string; expires_at: string }>();

    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          run: async () => {
            if (sql.includes("INSERT INTO admin_sessions")) {
              const [, , tokenHash, , , expiresAt] = args as [
                string,
                string,
                string,
                string,
                string,
                string,
              ];
              d1Sessions.set(tokenHash, { id: "sess-1", expires_at: expiresAt });
            }
            if (sql.includes("DELETE FROM admin_sessions")) {
              const [tokenHash] = args as [string];
              d1Sessions.delete(tokenHash);
            }
            return { success: true };
          },
          all: async () => ({ results: [], success: true }),
          first: async () => {
            if (sql.includes("FROM admin_sessions")) {
              const [tokenHash] = args as [string];
              const s = d1Sessions.get(tokenHash);
              if (s) return { id: s.id };
              return null;
            }
            return null;
          },
        }),
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () => null,
      }),
      batch: async () => [{ success: true }],
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const env = { DB: mockDb, ADMIN_PASSWORD: TEST_ADMIN_PASSWORD };

    // 1. Login with D1
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.91" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      env,
    );
    expect(loginRes?.status).toBe(200);
    const loginData = (await loginRes?.json()) as { token: string };

    // 2. Validate token against /api/admin/me (success)
    const meReq1 = new Request("https://bycarglobal.com/api/admin/me", {
      headers: { authorization: `Bearer ${loginData.token}` },
    });
    const meRes1 = await handleApiRequest(meReq1, env);
    expect(meRes1?.status).toBe(200);

    // 3. Authoritative D1 revocation: session is deleted from D1
    d1Sessions.clear();

    // 4. Verify that next request MUST return 401 Unauthorized (memory fallback is NOT used when D1 is available)
    const meReq2 = new Request("https://bycarglobal.com/api/admin/me", {
      headers: { authorization: `Bearer ${loginData.token}` },
    });
    const meRes2 = await handleApiRequest(meReq2, env);
    expect(meRes2?.status).toBe(401);
  });

  it("Regression Test 13: Login via ADMIN_PASSWORD on fresh DB auto-provisions admin-master to satisfy FK", async () => {
    const adminUsers = new Map<string, { id: string; username: string }>();
    const adminSessions = new Map<string, { id: string; admin_id: string }>();

    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          run: async () => {
            if (sql.includes("INSERT INTO admin_users")) {
              adminUsers.set("admin-master", { id: "admin-master", username: "admin" });
            }
            if (sql.includes("INSERT INTO admin_sessions")) {
              const [, adminId, tokenHash] = args as [string, string, string];
              // Simulate Foreign Key enforcement
              if (!adminUsers.has(adminId)) {
                throw new Error("SQLITE_CONSTRAINT: FOREIGN KEY constraint failed");
              }
              adminSessions.set(tokenHash, { id: "sess-1", admin_id: adminId });
            }
            return { success: true };
          },
          all: async () => ({ results: [], success: true }),
          first: async () => {
            if (sql.includes("FROM admin_users")) {
              return null; // 0 rows in admin_users
            }
            if (sql.includes("FROM admin_sessions")) {
              const [tokenHash] = args as [string];
              if (adminSessions.has(tokenHash)) return { id: "sess-1" };
              return null;
            }
            return null;
          },
        }),
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () => null,
      }),
      batch: async () => [{ success: true }],
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const env = { DB: mockDb, ADMIN_PASSWORD: "FreshSecretPassword2026!" };

    // Fresh login with 0 rows in admin_users: MUST succeed with 200 (not 500)
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.92" },
        body: JSON.stringify({ password: "FreshSecretPassword2026!" }),
      }),
      env,
    );

    expect(loginRes?.status).toBe(200);
    expect(adminUsers.has("admin-master")).toBe(true);
  });

  it("Regression Test 14: POST /api/cms strips customPasswordHash on D1 write path", async () => {
    let savedCmsConfigSqlVal = "";

    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => {
          if (sql.includes("cms_config")) {
            savedCmsConfigSqlVal = String(args[0]);
          }
          return {
            run: async () => ({ success: true }),
            all: async () => ({ results: [], success: true }),
            first: async () => {
              if (sql.includes("cms_revision")) return { value: "1" };
              return null;
            },
          };
        },
        run: async () => ({ success: true }),
        all: async () => ({ results: [], success: true }),
        first: async () => null,
      }),
      batch: async () => [{ success: true }],
      exec: async () => ({ count: 0, duration: 0 }),
    };

    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.93" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    const req = new Request("https://bycarglobal.com/api/cms", {
      method: "POST",
      headers: {
        authorization: `Bearer ${loginData.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        revision: 1,
        cmsConfig: {
          hero: { titleTr: "ByCar Test" },
          customPasswordHash: "malicious_leaked_hash_12345",
          secret: "super_secret_value",
        },
      }),
    });

    const res = await handleApiRequest(req, { DB: mockDb });
    expect(res?.status).toBe(200);
    expect(savedCmsConfigSqlVal).toContain("ByCar Test");
    expect(savedCmsConfigSqlVal).not.toContain("customPasswordHash");
    expect(savedCmsConfigSqlVal).not.toContain("malicious_leaked_hash_12345");
    expect(savedCmsConfigSqlVal).not.toContain("secret");
  });

  it("Regression Test 15: AVIF magic byte check accepts real AVIF and rejects fake video container", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.94" },
        body: JSON.stringify({ password: TEST_ADMIN_PASSWORD }),
      }),
      {},
    );
    const loginData = (await loginRes?.json()) as { token: string };

    // 1. Fake MP4 disguised as AVIF: bytes 4-7 are 'ftyp', but bytes 8-11 are 'mp42'
    const fakeMp4Bytes = new Uint8Array(32);
    // bytes 4-7: 'ftyp' (0x66, 0x74, 0x79, 0x70)
    fakeMp4Bytes[4] = 0x66;
    fakeMp4Bytes[5] = 0x74;
    fakeMp4Bytes[6] = 0x79;
    fakeMp4Bytes[7] = 0x70;
    // bytes 8-11: 'mp42' (0x6d, 0x70, 0x34, 0x32)
    fakeMp4Bytes[8] = 0x6d;
    fakeMp4Bytes[9] = 0x70;
    fakeMp4Bytes[10] = 0x34;
    fakeMp4Bytes[11] = 0x32;

    const fakeUploadRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${loginData.token}`,
          "content-type": "image/avif",
        },
        body: fakeMp4Bytes.buffer,
      }),
      { BUCKET: { put: async () => ({}) } },
    );
    expect(fakeUploadRes?.status).toBe(400);

    // 2. Real AVIF: bytes 4-7 are 'ftyp', and bytes 8-11 are 'avif' (0x61, 0x76, 0x69, 0x66)
    const realAvifBytes = new Uint8Array(32);
    realAvifBytes[4] = 0x66;
    realAvifBytes[5] = 0x74;
    realAvifBytes[6] = 0x79;
    realAvifBytes[7] = 0x70;
    realAvifBytes[8] = 0x61;
    realAvifBytes[9] = 0x76;
    realAvifBytes[10] = 0x69;
    realAvifBytes[11] = 0x66;

    const realUploadRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${loginData.token}`,
          "content-type": "image/avif",
        },
        body: realAvifBytes.buffer,
      }),
      { BUCKET: { put: async () => ({}) } },
    );
    expect(realUploadRes?.status).toBe(200);
  });

  it("Regression Test 16: Empty catalog without allowEmptyCatalog returns 400 (B5)", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "SecrEtPassword!2026" }),
      }),
      { ADMIN_PASSWORD: "SecrEtPassword!2026" },
    );
    const { token } = (await loginRes?.json()) as { token: string };

    const cmsRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/cms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cars: [],
          revision: 1,
        }),
      }),
      { ADMIN_PASSWORD: "SecrEtPassword!2026" },
    );
    expect(cmsRes?.status).toBe(400);
    const body = await cmsRes?.json();
    expect(body.error).toContain("allowEmptyCatalog");
  });

  it("Regression Test 17: Duplicate slug across payload cars returns 400 (B2)", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "SecrEtPassword!2026" }),
      }),
      { ADMIN_PASSWORD: "SecrEtPassword!2026" },
    );
    const { token } = (await loginRes?.json()) as { token: string };

    const cmsRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/cms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cars: [
            {
              id: "car-1",
              brand: "Porsche",
              title: "911 GT3",
              slug: "porsche-gt3",
              year: 2024,
              km: 1000,
              fuel: "Benzin",
              gear: "Otomatik",
              body: "Coupe",
              status: "active",
            },
            {
              id: "car-2",
              brand: "Porsche",
              title: "911 GT3 RS",
              slug: "porsche-gt3", // Duplicate slug!
              year: 2024,
              km: 500,
              fuel: "Benzin",
              gear: "Otomatik",
              body: "Coupe",
              status: "active",
            },
          ],
          revision: 1,
        }),
      }),
      { ADMIN_PASSWORD: "SecrEtPassword!2026" },
    );
    expect(cmsRes?.status).toBe(400);
    const body = await cmsRes?.json();
    expect(body.error).toContain("porsche-gt3");
  });

  it("Regression Test 18: Media response includes x-content-type-options: nosniff (B6)", async () => {
    const fakeStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("fake-image"));
        controller.close();
      },
    });

    const res = await handleApiRequest(
      new Request("https://bycarglobal.com/api/media/vehicles/test/img.webp", {
        method: "GET",
      }),
      {
        BUCKET: {
          get: async () => ({
            body: fakeStream,
            httpMetadata: { contentType: "image/webp" },
          }),
        },
      },
    );
    expect(res?.status).toBe(200);
    expect(res?.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("Regression Test 19: Customer inquiry sanitizes HTML script tags (B6)", async () => {
    const res = await handleApiRequest(
      new Request("https://bycarglobal.com/api/inquiry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.199",
        },
        body: JSON.stringify({
          type: "Teklif",
          car: "Porsche 911 <script>alert(1)</script>",
          name: "Ahmet <script>alert('xss')</script>",
          phone: "+90 555 123 4567",
          offerOrBudget: "100000 EUR",
          details: "<img src=x onerror=alert(1)>",
        }),
      }),
      {},
    );
    expect(res?.status).toBe(200);
    const data = await res?.json();
    expect(data.ok).toBe(true);

    // Verify stored inquiry text in GET /api/admin/inquiries
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "SecrEtPassword!2026" }),
      }),
      { ADMIN_PASSWORD: "SecrEtPassword!2026" },
    );
    const { token } = (await loginRes?.json()) as { token: string };

    const inqRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/inquiries", {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      }),
      { ADMIN_PASSWORD: "SecrEtPassword!2026" },
    );
    const inqData = await inqRes?.json();
    const stored = inqData.inquiries.find((i: { id: string }) => i.id === data.inquiryId);
    expect(stored).toBeDefined();
    expect(stored.name).not.toContain("<script>");
    expect(stored.name).toContain("&lt;script&gt;");
    expect(stored.car).toContain("&lt;script&gt;");
  });

  it("Regression Test 20: Upload path traversal dots are stripped from safeName (B6)", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "SecrEtPassword!2026" }),
      }),
      { ADMIN_PASSWORD: "SecrEtPassword!2026" },
    );
    const { token } = (await loginRes?.json()) as { token: string };

    let uploadedKey = "";
    const mockBucket = {
      put: async (key: string) => {
        uploadedKey = key;
        return {};
      },
    };

    // Valid PNG magic bytes: 89 50 4E 47
    const validPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00]);

    const res = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "image/png",
          "x-file-name": "../../etc/passwd..evil.png",
          "x-vehicle-id": "car-123",
        },
        body: validPng.buffer,
      }),
      { BUCKET: mockBucket },
    );
    expect(res?.status).toBe(200);
    expect(uploadedKey).not.toContain("..");
  });

  it("Regression Test 21: POST /api/admin/upload accepts valid MP4 and WebM video files and sets R2 content-type", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "SecrEtPassword!2026" }),
      }),
      { ADMIN_PASSWORD: "SecrEtPassword!2026" },
    );
    const { token } = (await loginRes?.json()) as { token: string };

    let uploadedKey = "";
    let uploadedMeta: { contentType?: string } | undefined;
    const mockBucket = {
      put: async (
        key: string,
        _body: unknown,
        options?: { httpMetadata?: { contentType?: string } },
      ) => {
        uploadedKey = key;
        uploadedMeta = options?.httpMetadata;
        return {};
      },
    };

    // Valid MP4 magic bytes: 00 00 00 20 'ftyp' 'isom'
    const validMp4 = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x20,
      0x66,
      0x74,
      0x79,
      0x70, // 'ftyp'
      0x69,
      0x73,
      0x6f,
      0x6d, // 'isom'
      0x00,
      0x00,
      0x02,
      0x00,
    ]);

    const res = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "video/mp4",
          "x-file-name": "porsche-promo.mp4",
          "x-vehicle-id": "car-911",
        },
        body: validMp4.buffer,
      }),
      { BUCKET: mockBucket },
    );

    expect(res?.status).toBe(200);
    const data = (await res?.json()) as { ok: boolean; url: string };
    expect(data.ok).toBe(true);
    expect(data.url).toContain("/api/media/vehicles%2Fcar-911%2F");
    expect(uploadedKey).toContain("porsche-promo.mp4");
    expect(uploadedMeta?.contentType).toBe("video/mp4");
  });

  it("Regression Test 22: GET /api/media supports video range streaming with 206 Partial Content", async () => {
    const mockBucket = {
      get: async (
        _key: string,
        options?: { range?: Headers | { offset?: number; length?: number } },
      ) => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3, 4]));
            controller.close();
          },
        });
        const hasRange = Boolean(options?.range);
        return {
          body: stream,
          httpMetadata: { contentType: "video/mp4" },
          size: 1000,
          range: hasRange ? { offset: 0, length: 500 } : undefined,
        };
      },
    };

    const req = new Request("https://bycarglobal.com/api/media/vehicles%2Fcar-911%2Fvideo.mp4", {
      method: "GET",
      headers: { range: "bytes=0-499" },
    });

    const res = await handleApiRequest(req, { BUCKET: mockBucket });
    expect(res?.status).toBe(206);
    expect(res?.headers.get("content-type")).toBe("video/mp4");
    expect(res?.headers.get("accept-ranges")).toBe("bytes");
    expect(res?.headers.get("content-range")).toBe("bytes 0-499/1000");
  });
});
