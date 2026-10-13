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

  it("POST /api/cms preserves non-present vehicles and safely deletes only explicit deletedCarIds", async () => {
    // 1. Login to obtain admin token
    const loginReq = new Request("https://bycarglobal.com/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.99" },
      body: JSON.stringify({ password: "bybycar1453" }),
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
      body: JSON.stringify({ cars: initialCars }),
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
      body: JSON.stringify({ cars: [initialCars[0]] }),
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
      body: JSON.stringify({ deletedCarIds: ["car-preserve-2"] }),
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
      body: JSON.stringify({ password: "bybycar1453" }),
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
        body: JSON.stringify({ password: "bybycar1453" }),
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
        body: JSON.stringify({ password: "bybycar1453" }),
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

  it("Regression Test 3c: D1 Batch chunking splits large statements into chunks of 50 and triggers R2 orphan media deletion", async () => {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "bybycar1453" }),
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

    // Construct 20 cars with 3 images each = >100 statements
    const cars = Array.from({ length: 20 }, (_, i) => ({
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

    // Assert that batch was chunked into <= 50 statements
    expect(batchCalls.length).toBeGreaterThanOrEqual(2);
    for (const chunk of batchCalls) {
      expect(chunk.length).toBeLessThanOrEqual(50);
    }

    // Assert that orphaned R2 key was deleted
    expect(deletedR2Keys).toContain("vehicles/car-del-1/1");
  });
});
