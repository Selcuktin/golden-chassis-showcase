import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";
import { handleApiRequest, type D1Database } from "../server/api";

function createSqliteD1(sqlite: DatabaseSync): D1Database {
  return {
    prepare(query: string) {
      let boundArgs: unknown[] = [];
      const wrapper = {
        bind(...args: unknown[]) {
          boundArgs = args.map((a) => (a === undefined ? null : a));
          return wrapper;
        },
        async run() {
          const stmt = sqlite.prepare(query);
          const info = stmt.run(...(boundArgs as (string | number | bigint | null | Uint8Array)[]));
          return { success: true, meta: { changes: Number(info.changes) } };
        },
        async all<T = unknown>() {
          const stmt = sqlite.prepare(query);
          const results = stmt.all(
            ...(boundArgs as (string | number | bigint | null | Uint8Array)[]),
          ) as T[];
          return { results, success: true };
        },
        async first<T = unknown>(col?: string) {
          const stmt = sqlite.prepare(query);
          const row = stmt.get(
            ...(boundArgs as (string | number | bigint | null | Uint8Array)[]),
          ) as Record<string, unknown> | undefined;
          if (!row) return null;
          if (col) return (row[col] as T) ?? null;
          return row as T;
        },
      };
      return wrapper;
    },
    async batch(stmts: unknown[]) {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const s of stmts as Array<{ run: () => Promise<unknown> }>) {
          results.push(await s.run());
        }
        sqlite.exec("COMMIT");
        return results;
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      }
    },
    async exec(query: string) {
      sqlite.exec(query);
      return { count: 1, duration: 1 };
    },
  };
}

describe("Real SQLite (Node:sqlite) D1 Compliance & Security Suite (B1-B7)", () => {
  let sqlite: DatabaseSync;
  let d1: D1Database;
  const adminSecret = "TestSuperAdmin!2026#ByCar";

  beforeEach(() => {
    sqlite = new DatabaseSync(":memory:");
    sqlite.exec("PRAGMA foreign_keys = ON;");

    // Use the same ordered migrations as Wrangler, never a parallel test schema.
    const migrationsPath = path.resolve(__dirname, "../../drizzle");
    for (const file of fs
      .readdirSync(migrationsPath)
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      sqlite.exec(fs.readFileSync(path.join(migrationsPath, file), "utf-8"));
    }

    // Seed default revision
    sqlite.exec("INSERT OR IGNORE INTO site_settings (key, value) VALUES ('cms_revision', '1');");

    d1 = createSqliteD1(sqlite);
  });

  afterEach(() => sqlite.close());

  async function getAdminToken(): Promise<string> {
    const loginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: adminSecret }),
      }),
      { DB: d1, ADMIN_PASSWORD: adminSecret },
    );
    const data = (await loginRes?.json()) as { token: string };
    return data.token;
  }

  it("B1: Real SQLite aborts on CAS revision mismatch and never creates NULL key in site_settings", async () => {
    const token = await getAdminToken();

    // Stale revision save attempt (revision 99 when db is at 1)
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
              id: "car-atomic-1",
              brand: "Ferrari",
              title: "SF90 Stradale",
              slug: "sf90-stradale",
              year: 2024,
              km: 500,
              fuel: "Hybrid",
              gear: "Otomatik",
              body: "Coupe",
              status: "active",
            },
          ],
          revision: 99, // Stale revision
        }),
      }),
      { DB: d1, ADMIN_PASSWORD: adminSecret },
    );

    expect(cmsRes?.status).toBe(409);
    const body = await cmsRes?.json();
    expect(body.conflict).toBe(true);

    // Verify atomic rollback in SQLite: no vehicle was inserted
    const vehicleRow = sqlite.prepare("SELECT * FROM vehicles WHERE id = 'car-atomic-1'").get();
    expect(vehicleRow).toBeUndefined();

    // Verify no NULL key was ever inserted into site_settings
    const nullRow = sqlite.prepare("SELECT * FROM site_settings WHERE key IS NULL").get();
    expect(nullRow).toBeUndefined();
  });

  it("B2: Real SQLite returns distinct 400 for duplicate slug across cars instead of masking as 409", async () => {
    const token = await getAdminToken();

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
              id: "car-a",
              brand: "BMW",
              title: "M5 CS",
              slug: "duplicate-slug",
              year: 2023,
              km: 5000,
              fuel: "Benzin",
              gear: "Otomatik",
              body: "Sedan",
              status: "active",
            },
            {
              id: "car-b",
              brand: "BMW",
              title: "M5 Competition",
              slug: "duplicate-slug",
              year: 2023,
              km: 8000,
              fuel: "Benzin",
              gear: "Otomatik",
              body: "Sedan",
              status: "active",
            },
          ],
          revision: 1,
        }),
      }),
      { DB: d1, ADMIN_PASSWORD: adminSecret },
    );

    expect(cmsRes?.status).toBe(400);
    const body = await cmsRes?.json();
    expect(body.error).toContain("Benzersizlik");
  });

  it("B3: Real SQLite preserves custom password when admin subsequently logs in via ADMIN_PASSWORD", async () => {
    // 1. Initial login via env creates admin-master row
    const token1 = await getAdminToken();

    // 2. Change password from admin panel
    const changeRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/change-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token1}`,
        },
        body: JSON.stringify({
          currentPassword: adminSecret,
          newPassword: "BrandNewCustomPassword!2026",
        }),
      }),
      { DB: d1, ADMIN_PASSWORD: adminSecret },
    );
    expect(changeRes?.status).toBe(200);

    // 3. Login with newly changed custom password -> SUCCESS 200
    const customLoginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "BrandNewCustomPassword!2026" }),
      }),
      { DB: d1, ADMIN_PASSWORD: adminSecret },
    );
    expect(customLoginRes?.status).toBe(200);

    // 4. Emergency break-glass login with env secret -> SUCCESS 200
    const envLoginRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: adminSecret }),
      }),
      { DB: d1, ADMIN_PASSWORD: adminSecret },
    );
    expect(envLoginRes?.status).toBe(200);

    // 5. Custom password MUST STILL BE VALID and NOT OVERWRITTEN!
    const verifyCustomAgainRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "BrandNewCustomPassword!2026" }),
      }),
      { DB: d1, ADMIN_PASSWORD: adminSecret },
    );
    expect(verifyCustomAgainRes?.status).toBe(200);
  });

  it("B5: Real SQLite enforces empty catalog protection when allowEmptyCatalog is false", async () => {
    const token = await getAdminToken();

    const emptyRes = await handleApiRequest(
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
      { DB: d1, ADMIN_PASSWORD: adminSecret },
    );
    expect(emptyRes?.status).toBe(400);
  });

  it("B6: Real SQLite sanitizes HTML input in customer inquiries", async () => {
    const inqRes = await handleApiRequest(
      new Request("https://bycarglobal.com/api/inquiry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "198.51.100.55",
        },
        body: JSON.stringify({
          type: "Teklif",
          car: "Audi RS6 <script>alert(1)</script>",
          name: "Mehmet <script>alert('xss')</script>",
          phone: "+90 532 999 8877",
          offerOrBudget: "250000 EUR",
          details: "<iframe src='evil.com'></iframe>",
        }),
      }),
      { DB: d1 },
    );
    expect(inqRes?.status).toBe(200);

    // Inspect direct row in SQLite database
    const row = sqlite
      .prepare("SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 1")
      .get() as {
      customer_name: string;
      car_title: string;
      details: string;
    };
    expect(row).toBeDefined();
    expect(row.customer_name).not.toContain("<script>");
    expect(row.customer_name).toContain("&lt;script&gt;");
    expect(row.car_title).toContain("&lt;script&gt;");
    expect(row.details).toContain("&lt;iframe");
  });
});
