import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getPlatformProxy, type PlatformProxy } from "wrangler";
import {
  getLiveCmsData,
  getLiveSiteData,
  getLiveVehicleBySlug,
  deriveServerPBKDF2HexWithParams,
  handleApiRequest,
  type D1Database as ApiDatabase,
} from "../../src/server/api";
import { createDatabase } from "../../src/server/db/client";
import { siteSettings, vehicles } from "../../src/server/db/schema";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const secret = "IntegrationOnlyPassword!2026";
type Bindings = { DB: D1Database; BUCKET: R2Bucket };

async function createLocalDatabase(
  legacy: boolean | "empty" | "before-seed-repair" | "before-rebrand" = false,
) {
  const directory = await mkdtemp(path.join(tmpdir(), "bycar-d1-test-"));
  const configPath = path.join(directory, "wrangler.json");
  const persist = path.join(directory, ".wrangler", "state");
  const config = JSON.parse(
    await readFile(path.join(root, "tests/fixtures/wrangler.json"), "utf8"),
  );
  config.d1_databases[0].migrations_dir = path.join(root, "drizzle");
  if (legacy === "before-seed-repair" || legacy === "before-rebrand") {
    const priorMigrations = path.join(directory, "migrations");
    await mkdir(priorMigrations);
    const names = ["0000_baseline.sql", "0001_site_settings_integrity.sql"];
    if (legacy === "before-rebrand")
      names.push("0002_revoke_legacy_seed_admin.sql", "0003_catalog_order.sql");
    for (const name of names) {
      await copyFile(path.join(root, "drizzle", name), path.join(priorMigrations, name));
    }
    config.d1_databases[0].migrations_dir = priorMigrations;
  }
  await writeFile(configPath, JSON.stringify(config));

  async function wrangler(...args: string[]) {
    return execFileAsync(
      process.execPath,
      [
        path.join(root, "node_modules/wrangler/bin/wrangler.js"),
        ...args,
        "--config",
        configPath,
        "--local",
        ...(args[1] === "export" ? [] : ["--persist-to", persist]),
      ],
      { env: { ...process.env, WRANGLER_SEND_METRICS: "false" }, maxBuffer: 4 * 1024 * 1024 },
    );
  }
  if (legacy === true) {
    await wrangler(
      "d1",
      "execute",
      "DB",
      "--file",
      path.join(root, "tests/fixtures/legacy-schema.sql"),
    );
  } else if (legacy === false || legacy === "before-seed-repair" || legacy === "before-rebrand") {
    await wrangler("d1", "migrations", "apply", "DB");
  }

  let proxy: PlatformProxy<Bindings>;
  const connect = async () => {
    proxy = await getPlatformProxy<Bindings>({
      configPath,
      persist: { path: path.join(persist, "v3") },
      remoteBindings: false,
      envFiles: [],
    });
    return proxy.env;
  };
  const env = await connect();
  return {
    env,
    async exportTo(file: string) {
      await proxy.dispose();
      try {
        await wrangler("d1", "export", "DB", "--output", file);
      } finally {
        this.env = await connect();
      }
    },
    async restoreFrom(file: string) {
      await proxy.dispose();
      try {
        await wrangler("d1", "execute", "DB", "--file", file);
      } finally {
        this.env = await connect();
      }
    },
    // Stop workerd before the CLI opens the same persisted SQLite database.
    async migrate() {
      await proxy.dispose();
      config.d1_databases[0].migrations_dir = path.join(root, "drizzle");
      await writeFile(configPath, JSON.stringify(config));
      try {
        const result = await wrangler("d1", "migrations", "apply", "DB");
        return result.stdout;
      } finally {
        this.env = await connect();
      }
    },
    async dispose() {
      await proxy.dispose();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

const car = {
  id: "integration-car",
  slug: "integration-car",
  brand: "BMW",
  title: "M5",
  year: 2024,
  km: 1000,
  fuel: "Benzin",
  gear: "Otomatik",
  body: "Sedan",
  status: "active",
};

function post(endpoint: string, body: unknown, token?: string) {
  return new Request(`https://bycarglobal.com${endpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("Wrangler migrations and actual local D1/R2 bindings", () => {
  let local: Awaited<ReturnType<typeof createLocalDatabase>>;
  let token: string;

  beforeAll(async () => {
    local = await createLocalDatabase();
    const response = await handleApiRequest(post("/api/admin/login", { password: secret }), {
      ...local.env,
      ADMIN_PASSWORD: secret,
    });
    expect(response?.status).toBe(200);
    token = ((await response!.json()) as { token: string }).token;
  });
  afterAll(async () => local?.dispose());

  it("restores an actual local D1 export into a separately migrated target without losing seed-conflicting settings", async () => {
    await mkdir(path.join(root, ".wrangler"), { recursive: true });
    const folder = await mkdtemp(path.join(root, ".wrangler", "transfer-restore-"));
    const target = await createLocalDatabase();
    try {
      await local.env.DB.prepare("INSERT INTO site_settings (key,value,updated_at) VALUES (?,?,?)")
        .bind("transfer_fixture", "Türkçe 'tırnak'; -- güvenli", "2026-10-19T00:00:00Z")
        .run();
      await local.env.DB.prepare(
        "UPDATE site_settings SET value='42' WHERE key='cms_revision'",
      ).run();
      const dump = path.join(folder, "source.sql");
      const restore = path.join(folder, "restore.sql");
      await local.exportTo(dump);
      await execFileAsync(process.execPath, [
        path.join(root, "scripts/prepare-transfer-restore.mjs"),
        dump,
        restore,
      ]);
      await target.restoreFrom(restore);
      const tables = [
        "vehicles",
        "vehicle_images",
        "inquiries",
        "admin_users",
        "admin_sessions",
        "login_attempts",
        "site_settings",
        "inquiry_attempts",
        "r2_cleanup_queue",
      ];
      for (const table of tables) {
        const query = `SELECT * FROM ${table} ORDER BY ${table === "site_settings" ? "key" : "id"}`;
        expect((await target.env.DB.prepare(query).all()).results).toEqual(
          (await local.env.DB.prepare(query).all()).results,
        );
      }
      expect(
        await target.env.DB.prepare(
          "SELECT value FROM site_settings WHERE key='cms_revision'",
        ).first("value"),
      ).toBe("42");
      expect((await target.env.DB.prepare("PRAGMA foreign_key_check").all()).results).toEqual([]);
      expect(
        await target.env.DB.prepare("SELECT COUNT(*) AS n FROM d1_migrations").first("n"),
      ).toBe(5);
      // Restore is deliberately not replayable over a populated target.
      await expect(target.restoreFrom(restore)).rejects.toThrow();
    } finally {
      await local.env.DB.prepare("DELETE FROM site_settings WHERE key='transfer_fixture'").run();
      await local.env.DB.prepare(
        "UPDATE site_settings SET value='1' WHERE key='cms_revision'",
      ).run();
      await target.dispose();
      await rm(folder, { recursive: true, force: true });
    }
  });

  it("freezes all transfer mutations without changing actual D1 or R2", async () => {
    const snapshot = async () => {
      const tables = [
        "vehicles",
        "vehicle_images",
        "inquiries",
        "admin_users",
        "admin_sessions",
        "login_attempts",
        "site_settings",
        "inquiry_attempts",
        "r2_cleanup_queue",
      ];
      return Promise.all(
        tables.map((table) =>
          local.env.DB.prepare(
            `SELECT * FROM ${table} ORDER BY ${table === "site_settings" ? "key" : "id"}`,
          )
            .all()
            .then((result) => result.results),
        ),
      );
    };
    const before = await snapshot();
    const mediaBefore = (await local.env.BUCKET.list()).objects.map(({ key, size }) => ({
      key,
      size,
    }));
    for (const endpoint of [
      "/api/admin/login",
      "/api/admin/logout",
      "/api/admin/change-password",
      "/api/admin/upload",
      "/api/admin/media/gc",
      "/api/cms",
      "/api/inquiry",
      "/api/admin/inquiries/status",
      "/api/admin/inquiries/delete",
    ]) {
      const response = await handleApiRequest(post(endpoint, {}, token), {
        ...local.env,
        TRANSFER_WRITE_LOCK: "true",
        ADMIN_PASSWORD: secret,
      });
      expect(response?.status).toBe(503);
    }
    expect(await snapshot()).toEqual(before);
    expect((await local.env.BUCKET.list()).objects.map(({ key, size }) => ({ key, size }))).toEqual(
      mediaBefore,
    );
    expect(
      (
        await handleApiRequest(new Request("https://local.invalid/api/health"), {
          ...local.env,
          TRANSFER_WRITE_LOCK: "true",
        })
      )?.status,
    ).toBe(200);
  });

  it("reads only one vehicle and current settings for detail, with measured local D1 savings", async () => {
    const isolated = await createLocalDatabase();
    try {
      const db = isolated.env.DB;
      for (let n = 0; n < 20; n++) {
        const id = `read-cost-${n}`;
        await db
          .prepare(
            "INSERT INTO vehicles (id,slug,brand,title,year,fuel,gear,body,power,color,package,expertise) VALUES (?,?,'BMW','Fixture',2024,'Benzin','Otomatik','Sedan','500','Siyah','Paket','Ekspertiz')",
          )
          .bind(id, id)
          .run();
        await db
          .prepare("INSERT INTO vehicle_images (id,vehicle_id,r2_key,public_url) VALUES (?,?,?,?)")
          .bind(id, id, id, `/api/media/${id}`)
          .run();
      }
      const measure = () => {
        const stats = { queries: 0, rowsRead: 0 };
        const wrap = (stmt: ReturnType<D1Database["prepare"]>): unknown => ({
          bind: (...args: unknown[]) => wrap(stmt.bind(...args)),
          all: async () => {
            const response = await stmt.all();
            stats.queries++;
            stats.rowsRead += response.meta.rows_read;
            return response;
          },
          first: async (column?: string) => {
            const response = await stmt.all<Record<string, unknown>>();
            stats.queries++;
            stats.rowsRead += response.meta.rows_read;
            const row = response.results[0];
            return row ? (column ? row[column] : row) : null;
          },
        });
        return {
          stats,
          env: { DB: { prepare: (query: string) => wrap(db.prepare(query)) } as ApiDatabase },
        };
      };
      const before = measure();
      const [oldCar, fullCatalog] = await Promise.all([
        getLiveVehicleBySlug("read-cost-0", before.env),
        getLiveCmsData(before.env),
      ]);
      const after = measure();
      const [newCar, site] = await Promise.all([
        getLiveVehicleBySlug("read-cost-0", after.env),
        getLiveSiteData(after.env),
      ]);
      expect(newCar).toEqual(oldCar);
      expect(site).toEqual({ settings: fullCatalog.settings, cmsConfig: fullCatalog.cmsConfig });
      expect(before.stats.queries).toBe(5);
      expect(after.stats.queries).toBe(3);
      expect(after.stats.rowsRead).toBeLessThan(before.stats.rowsRead);
      console.info("Local D1 detail read cost", { before: before.stats, after: after.stats });
      await db
        .prepare("INSERT INTO site_settings (key,value) VALUES ('showcase_settings',?)")
        .bind(JSON.stringify({ quotaProbe: "fresh" }))
        .run();
      expect((await getLiveSiteData(isolated.env)).settings).toEqual({ quotaProbe: "fresh" });
    } finally {
      await isolated.dispose();
    }
  });

  it("creates all nine tables, both triggers, and the initial CMS revision", async () => {
    const db = local.env.DB;
    const tables = await db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all<{ name: string }>();
    expect(tables.results.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        "vehicles",
        "vehicle_images",
        "inquiries",
        "admin_users",
        "admin_sessions",
        "login_attempts",
        "site_settings",
        "inquiry_attempts",
        "r2_cleanup_queue",
      ]),
    );
    expect(await db.prepare("SELECT COUNT(*) AS count FROM d1_migrations").first("count")).toBe(5);
    expect(
      await db
        .prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'trigger'")
        .first("count"),
    ).toBe(2);
    expect(
      await db.prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'").first("value"),
    ).toBe("1");
    const columns = await db
      .prepare("PRAGMA table_info(site_settings)")
      .all<{ name: string; notnull: number }>();
    expect(columns.results.find((c) => c.name === "key")?.notnull).toBe(1);
  });

  it("supports typed Drizzle queries and enforces NOT NULL on insert and update", async () => {
    const db = createDatabase(local.env.DB);
    await db.insert(siteSettings).values({ key: "integration_setting", value: "preserved" });
    expect(
      (await db.select().from(siteSettings).where(eq(siteSettings.key, "integration_setting")))[0]
        ?.value,
    ).toBe("preserved");
    await expect(
      local.env.DB.prepare("INSERT INTO site_settings (key, value) VALUES (NULL, 'invalid')").run(),
    ).rejects.toThrow();
    await expect(
      local.env.DB.prepare(
        "UPDATE site_settings SET key = NULL WHERE key = 'integration_setting'",
      ).run(),
    ).rejects.toThrow();
  });

  it("rejects CMS writes with an app session but no Access identity before changing real D1 data", async () => {
    const db = local.env.DB;
    const before = await db
      .prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'")
      .first("value");
    const response = await handleApiRequest(
      post(
        "/api/cms",
        {
          revision: Number(before),
          cars: [{ ...car, id: "access-denied-car", slug: "access-denied-car" }],
        },
        token,
      ),
      {
        ...local.env,
        CF_ACCESS_REQUIRED: "true",
        CF_ACCESS_TEAM_DOMAIN: "https://bycar-test.cloudflareaccess.com",
        CF_ACCESS_AUD: "test-admin-audience",
        CF_ACCESS_ALLOWED_EMAILS: "owner@example.com",
      },
    );
    expect(response?.status).toBe(401);
    expect(
      await db.prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'").first("value"),
    ).toBe(before);
    expect(
      await db.prepare("SELECT id FROM vehicles WHERE id = 'access-denied-car'").first(),
    ).toBeNull();
  });

  it("uploads to R2, saves CMS image metadata in D1, serves bytes, and protects referenced media during GC", async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const upload = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "image/png",
          "x-vehicle-id": car.id,
          "x-file-name": "test.png",
        },
        body: bytes,
      }),
      local.env,
    );
    expect(upload?.status).toBe(200);
    const image = (await upload!.json()) as { url: string; r2Key: string };
    const revision = Number(
      await local.env.DB.prepare(
        "SELECT value FROM site_settings WHERE key = 'cms_revision'",
      ).first("value"),
    );
    const save = await handleApiRequest(
      post("/api/cms", { revision, cars: [{ ...car, images: [image.url] }] }, token),
      local.env,
    );
    expect(save?.status).toBe(200);
    expect(
      await local.env.DB.prepare("SELECT r2_key FROM vehicle_images WHERE vehicle_id = ?")
        .bind(car.id)
        .first("r2_key"),
    ).toBe(image.r2Key);
    const media = await handleApiRequest(
      new Request(`https://bycarglobal.com${image.url}`),
      local.env,
    );
    expect(media?.status).toBe(200);
    expect(new Uint8Array(await media!.arrayBuffer())).toEqual(bytes);
    await local.env.DB.prepare(
      "INSERT INTO r2_cleanup_queue (id, r2_key, created_at) VALUES ('referenced', ?, 0)",
    )
      .bind(image.r2Key)
      .run();
    await local.env.BUCKET.put("vehicles/orphan/old.png", "unreferenced-media");
    await local.env.DB.prepare(
      "INSERT INTO r2_cleanup_queue (id, r2_key, created_at) VALUES ('orphan', 'vehicles/orphan/old.png', 0)",
    ).run();
    const gc = await handleApiRequest(
      post("/api/admin/media/gc", { mode: "queue" }, token),
      local.env,
    );
    expect(gc?.status).toBe(200);
    expect(await local.env.BUCKET.head(image.r2Key)).not.toBeNull();
    expect(await local.env.BUCKET.head("vehicles/orphan/old.png")).toBeNull();
    expect(
      await local.env.DB.prepare("SELECT id FROM r2_cleanup_queue WHERE id = 'referenced'").first(),
    ).toBeNull();
  });

  it("keeps password login and every admin mutation protected when Access is explicitly disabled", async () => {
    const env = {
      ...local.env,
      ADMIN_PASSWORD: secret,
      CF_ACCESS_REQUIRED: "false",
      CF_ACCESS_TEAM_DOMAIN: "https://stale.cloudflareaccess.com",
      CF_ACCESS_AUD: "stale-audience",
    };
    const login = await handleApiRequest(post("/api/admin/login", { password: secret }), env);
    expect(login?.status).toBe(200);
    const session = ((await login!.json()) as { token: string }).token;
    expect(
      (
        await handleApiRequest(
          new Request("https://bycarglobal.com/api/admin/me", {
            headers: { authorization: `Bearer ${session}` },
          }),
          env,
        )
      )?.status,
    ).toBe(200);
    for (const endpoint of [
      "/api/cms",
      "/api/admin/upload",
      "/api/admin/change-password",
      "/api/admin/media/gc",
      "/api/admin/inquiries/status",
      "/api/admin/inquiries/delete",
    ]) {
      expect((await handleApiRequest(post(endpoint, {}), env))?.status).toBe(401);
    }
    for (const endpoint of ["/api/admin/me", "/api/admin/inquiries", "/api/cms"]) {
      const read = await handleApiRequest(
        new Request(`https://bycarglobal.com${endpoint}`, {
          headers: { authorization: "Bearer forged-session" },
        }),
        env,
      );
      expect(read?.status).toBe(401);
    }
  });

  it("rejects oversized chunked uploads before writing R2 and cancels the incoming stream", async () => {
    const before = (await local.env.BUCKET.list()).objects.length;
    let cancelled = false;
    let pulled = 0;
    const body = new ReadableStream({
      pull(controller) {
        pulled++;
        controller.enqueue(new Uint8Array(1024 * 1024));
      },
      cancel() {
        cancelled = true;
      },
    });
    const response = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "image/png" },
        body,
        duplex: "half",
      } as RequestInit),
      local.env,
    );
    expect(response?.status).toBe(413);
    expect(cancelled).toBe(true);
    expect(pulled).toBeLessThanOrEqual(7);
    expect((await local.env.BUCKET.list()).objects.length).toBe(before);
  });

  it("uploads authenticated video and streams exact byte ranges from real R2", async () => {
    const bytes = new Uint8Array([
      0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7,
      8,
    ]);
    const upload = await handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "video/mp4",
          "x-file-name": "test.mp4",
        },
        body: bytes,
      }),
      local.env,
    );
    expect(upload?.status).toBe(200);
    const { url } = (await upload!.json()) as { url: string };
    for (const [range, start, end] of [
      ["bytes=0-3", 0, 3],
      ["bytes=8-", 8, 23],
      ["bytes=-4", 20, 23],
      ["bytes=20-99", 20, 23],
    ] as const) {
      const media = await handleApiRequest(
        new Request(`https://bycarglobal.com${url}`, { headers: { range } }),
        local.env,
      );
      expect(media?.status).toBe(206);
      expect(media?.headers.get("content-type")).toBe("video/mp4");
      expect(media?.headers.get("content-length")).toBe(String(end - start + 1));
      expect(media?.headers.get("content-range")).toBe(`bytes ${start}-${end}/${bytes.length}`);
      expect(new Uint8Array(await media!.arrayBuffer())).toEqual(bytes.slice(start, end + 1));
    }
    const head = await handleApiRequest(
      new Request(`https://bycarglobal.com${url}`, {
        method: "HEAD",
        headers: { range: "bytes=0-3" },
      }),
      local.env,
    );
    expect(head?.status).toBe(200);
    expect(head?.headers.get("content-length")).toBe(String(bytes.length));
    expect(head?.headers.has("content-range")).toBe(false);
    expect(await head!.text()).toBe("");
    const invalid = await handleApiRequest(
      new Request(`https://bycarglobal.com${url}`, { headers: { range: "bytes=100-200" } }),
      local.env,
    );
    expect(invalid?.status).toBe(416);
    expect(invalid?.headers.get("content-range")).toBe(`bytes */${bytes.length}`);
  });

  it("rolls the entire CMS batch back when another writer wins the revision race", async () => {
    const db = local.env.DB;
    const revision = Number(
      await db.prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'").first("value"),
    );
    const racingDb: ApiDatabase = {
      prepare: db.prepare.bind(db),
      exec: db.exec.bind(db),
      async batch(statements) {
        await db
          .prepare("UPDATE site_settings SET value = ? WHERE key = 'cms_revision'")
          .bind(String(revision + 1))
          .run();
        return db.batch(statements as Parameters<D1Database["batch"]>[0]);
      },
    };
    const response = await handleApiRequest(
      post(
        "/api/cms",
        {
          revision,
          cars: [{ ...car, id: "losing-writer", slug: "losing-writer" }],
        },
        token,
      ),
      { ...local.env, DB: racingDb },
    );
    expect(response?.status).toBe(409);
    expect(
      await db.prepare("SELECT id FROM vehicles WHERE id = 'losing-writer'").first(),
    ).toBeNull();
    expect(
      await db.prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'").first("value"),
    ).toBe(String(revision + 1));
    expect(await db.prepare("SELECT key FROM site_settings WHERE key IS NULL").first()).toBeNull();
  });

  it("preserves CHECK, UNIQUE and foreign-key constraints and delete actions", async () => {
    const db = local.env.DB;
    const constraintCar = {
      ...car,
      id: "constraint-car",
      slug: "constraint-car",
      power: "",
      color: "",
      package: "",
      expertise: "",
    };
    await createDatabase(db).insert(vehicles).values(constraintCar);
    await db
      .prepare(
        "INSERT INTO vehicle_images (id, vehicle_id, r2_key, public_url) VALUES ('constraint-image', ?, 'vehicles/constraint/test.png', '/constraint.png')",
      )
      .bind(constraintCar.id)
      .run();
    await expect(
      db.prepare("UPDATE vehicles SET year = 1899 WHERE id = ?").bind(constraintCar.id).run(),
    ).rejects.toThrow();
    await expect(
      db
        .prepare("UPDATE vehicles SET status = 'invalid' WHERE id = ?")
        .bind(constraintCar.id)
        .run(),
    ).rejects.toThrow();
    await expect(
      db
        .prepare(
          "INSERT INTO vehicle_images (id, vehicle_id, r2_key, public_url) VALUES ('bad-fk', 'missing', 'bad-fk', '/bad')",
        )
        .run(),
    ).rejects.toThrow();
    await expect(
      db
        .prepare("INSERT INTO site_settings (key, value) VALUES ('cms_revision', 'duplicate')")
        .run(),
    ).rejects.toThrow();
    await db
      .prepare(
        "INSERT INTO inquiries (id, type, vehicle_id, car_title, customer_name, phone, offer_or_budget) VALUES ('test-inquiry', 'Teklif', ?, 'M5', 'Test', '555', '100')",
      )
      .bind(constraintCar.id)
      .run();
    await createDatabase(db).delete(vehicles).where(eq(vehicles.id, constraintCar.id));
    expect(
      await db
        .prepare("SELECT id FROM vehicle_images WHERE vehicle_id = ?")
        .bind(constraintCar.id)
        .first(),
    ).toBeNull();
    expect(
      await db
        .prepare("SELECT vehicle_id FROM inquiries WHERE id = 'test-inquiry'")
        .first("vehicle_id"),
    ).toBeNull();
    expect((await db.prepare("PRAGMA foreign_key_check").all()).results).toEqual([]);
  });

  it("persists administrator order and keeps empty/draft catalogs authoritative across SSR, API, and sitemap", async () => {
    const db = local.env.DB;
    const revision = Number(
      await db.prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'").first("value"),
    );
    const ordered = ["order-b", "order-a"].map((id) => ({ ...car, id, slug: id }));
    const save = await handleApiRequest(
      post("/api/cms", { revision, cars: ordered }, token),
      local.env,
    );
    expect(save?.status).toBe(200);
    const live = await getLiveCmsData(local.env);
    expect(live.cars.filter((item) => item.id.startsWith("order-")).map((item) => item.id)).toEqual(
      ["order-b", "order-a"],
    );
    const old = await db
      .prepare("SELECT id, status FROM vehicles")
      .all<{ id: string; status: string }>();
    await db.prepare("UPDATE vehicles SET status = 'draft'").run();
    try {
      expect((await getLiveCmsData(local.env)).cars).toEqual([]);
      expect(await getLiveVehicleBySlug("order-a", local.env)).toBeNull();
      const response = await handleApiRequest(
        new Request("https://bycarglobal.com/api/cms"),
        local.env,
      );
      expect(await response!.json()).toMatchObject({ source: "d1", cars: [] });
      const sitemap = await handleApiRequest(
        new Request("https://bycarglobal.com/sitemap.xml"),
        local.env,
      );
      expect(await sitemap!.text()).not.toContain("/arac/");
    } finally {
      await db.batch(
        old.results.map((row) =>
          db.prepare("UPDATE vehicles SET status = ? WHERE id = ?").bind(row.status, row.id),
        ),
      );
    }
  });

  it.each([false, true])(
    "rolls back a large catalog when the revision changes in flight (force=%s)",
    async (force) => {
      const db = local.env.DB;
      const revision = Number(
        await db
          .prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'")
          .first("value"),
      );
      const before = await db.prepare("SELECT COUNT(*) AS count FROM vehicles").first("count");
      const racingDb: ApiDatabase = {
        prepare: db.prepare.bind(db),
        exec: db.exec.bind(db),
        async batch(statements) {
          expect(statements.length).toBeLessThan(30);
          await db
            .prepare("UPDATE site_settings SET value = ? WHERE key = 'cms_revision'")
            .bind(String(revision + 1))
            .run();
          return db.batch(statements as Parameters<D1Database["batch"]>[0]);
        },
      };
      const cars = Array.from({ length: 35 }, (_, index) => ({
        ...car,
        id: `race-${index}`,
        slug: `race-${index}`,
        images: [`/cars/test-${index}.jpg`],
      }));
      const response = await handleApiRequest(
        post(
          "/api/cms",
          {
            revision,
            cars,
            ...(force
              ? { force: true, forceExpectedRevision: revision, forceReason: "Integration race" }
              : {}),
          },
          token,
        ),
        { ...local.env, DB: racingDb },
      );
      expect(response?.status).toBe(409);
      expect(await db.prepare("SELECT COUNT(*) AS count FROM vehicles").first("count")).toBe(
        before,
      );
      expect(await db.prepare("SELECT id FROM vehicles WHERE id = 'race-0'").first()).toBeNull();
    },
  );

  it("persists customer inquiries and confirms status/delete mutations, including missing IDs", async () => {
    const db = local.env.DB;
    const response = await handleApiRequest(
      post("/api/inquiry", {
        type: "Teklif",
        vehicleId: car.id,
        car: "BMW M5",
        name: "Integration Client",
        phone: "+905551234567",
        offerOrBudget: "Trade-in request",
      }),
      local.env,
    );
    expect(response?.status).toBe(200);
    const id = ((await response!.json()) as { inquiryId: string }).inquiryId;
    expect(
      await db
        .prepare("SELECT vehicle_id FROM inquiries WHERE id = ?")
        .bind(id)
        .first("vehicle_id"),
    ).toBe(car.id);
    const status = await handleApiRequest(
      post("/api/admin/inquiries/status", { id, status: "Tamamlandı" }, token),
      local.env,
    );
    expect(status?.status).toBe(200);
    expect(
      await db.prepare("SELECT status FROM inquiries WHERE id = ?").bind(id).first("status"),
    ).toBe("Tamamlandı");
    expect(
      (await handleApiRequest(post("/api/admin/inquiries/delete", { id }), local.env))?.status,
    ).toBe(401);
    expect(
      (await handleApiRequest(post("/api/admin/inquiries/delete", { id }, token), local.env))
        ?.status,
    ).toBe(200);
    expect(await db.prepare("SELECT id FROM inquiries WHERE id = ?").bind(id).first()).toBeNull();
    expect(
      (
        await handleApiRequest(
          post("/api/admin/inquiries/status", { id, status: "Yeni" }, token),
          local.env,
        )
      )?.status,
    ).toBe(404);
    expect(
      (await handleApiRequest(post("/api/admin/inquiries/delete", { id }, token), local.env))
        ?.status,
    ).toBe(404);
  });

  it("admits only five concurrent customer requests per IP using one atomic D1 statement", async () => {
    const requests = Array.from({ length: 10 }, () => {
      const request = post("/api/inquiry", {
        type: "Teklif",
        name: "Parallel Client",
        phone: "+905551234567",
        car: "BMW M5",
        offerOrBudget: "Information",
      });
      request.headers.set("cf-connecting-ip", "192.0.2.151");
      return handleApiRequest(request, local.env);
    });
    const responses = await Promise.all(requests);
    expect(responses.filter((response) => response?.status === 200)).toHaveLength(5);
    expect(responses.filter((response) => response?.status === 429)).toHaveLength(5);
    expect(
      await local.env.DB.prepare(
        "SELECT COUNT(*) as count FROM inquiry_attempts WHERE ip = '192.0.2.151'",
      ).first("count"),
    ).toBe(5);
  });

  it("keeps retired images available for undo, preserves CMS/video media, and retries failed R2 deletion", async () => {
    const db = local.env.DB;
    const key = "vehicles/retired/old.png";
    const url = `/api/media/${encodeURIComponent(key)}`;
    await local.env.BUCKET.put(key, "original-image");
    let revision = Number(
      await db.prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'").first("value"),
    );
    expect(
      (
        await handleApiRequest(
          post(
            "/api/cms",
            { revision, cars: [{ ...car, id: "undo-car", slug: "undo-car", images: [url] }] },
            token,
          ),
          local.env,
        )
      )?.status,
    ).toBe(200);
    revision++;
    expect(
      (
        await handleApiRequest(
          post("/api/cms", { revision, deletedCarIds: ["undo-car"] }, token),
          local.env,
        )
      )?.status,
    ).toBe(200);
    expect(await local.env.BUCKET.head(key)).not.toBeNull();
    expect(
      await db.prepare("SELECT id FROM r2_cleanup_queue WHERE r2_key = ?").bind(key).first(),
    ).not.toBeNull();
    await handleApiRequest(post("/api/admin/media/gc", { mode: "full" }, token), local.env);
    expect(await local.env.BUCKET.head(key)).not.toBeNull();
    revision++;
    expect(
      (
        await handleApiRequest(
          post(
            "/api/cms",
            { revision, cars: [{ ...car, id: "undo-car", slug: "undo-car", images: [url] }] },
            token,
          ),
          local.env,
        )
      )?.status,
    ).toBe(200);
    await handleApiRequest(post("/api/admin/media/gc", { mode: "queue" }, token), local.env);
    expect(
      await db.prepare("SELECT id FROM r2_cleanup_queue WHERE r2_key = ?").bind(key).first(),
    ).toBeNull();
    expect(await local.env.BUCKET.head(key)).not.toBeNull();

    const hero = "vehicles/shared/hero.png";
    const video = "vehicles/shared/video.mp4";
    for (const candidate of [hero, video]) {
      await local.env.BUCKET.put(candidate, "referenced-content");
      await db
        .prepare("INSERT INTO r2_cleanup_queue (id, r2_key, created_at) VALUES (?, ?, 0)")
        .bind(candidate, candidate)
        .run();
    }
    await db
      .prepare(
        "INSERT INTO site_settings (key, value) VALUES ('cms_config', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .bind(JSON.stringify({ hero: { bgImage: `/api/media/${encodeURIComponent(hero)}` } }))
      .run();
    await db
      .prepare("UPDATE vehicles SET video_url = ? WHERE id = ?")
      .bind(`/api/media/${encodeURIComponent(video)}`, car.id)
      .run();
    await handleApiRequest(post("/api/admin/media/gc", { mode: "full" }, token), local.env);
    expect(await local.env.BUCKET.head(hero)).not.toBeNull();
    expect(await local.env.BUCKET.head(video)).not.toBeNull();

    await local.env.BUCKET.put("vehicles/failure/old.png", "retry-me");
    await db
      .prepare(
        "INSERT INTO r2_cleanup_queue (id, r2_key, created_at) VALUES ('retry-media', 'vehicles/failure/old.png', 0)",
      )
      .run();
    const failingBucket = {
      put: local.env.BUCKET.put.bind(local.env.BUCKET),
      get: local.env.BUCKET.get.bind(local.env.BUCKET),
      delete: async () => {
        throw new Error("R2 temporarily unavailable");
      },
    };
    const failed = await handleApiRequest(post("/api/admin/media/gc", { mode: "queue" }, token), {
      ...local.env,
      BUCKET: failingBucket,
    });
    expect(failed?.status).toBe(503);
    expect(
      await db
        .prepare("SELECT attempts FROM r2_cleanup_queue WHERE id = 'retry-media'")
        .first("attempts"),
    ).toBe(1);
    expect(await local.env.BUCKET.head("vehicles/failure/old.png")).not.toBeNull();
    expect(
      (await handleApiRequest(post("/api/admin/media/gc", { mode: "queue" }, token), local.env))
        ?.status,
    ).toBe(200);
    expect(await local.env.BUCKET.head("vehicles/failure/old.png")).toBeNull();
  });

  it("reports D1 read outages instead of returning a successful empty fallback", async () => {
    const db = local.env.DB;
    const broken: ApiDatabase = {
      ...local.env.DB,
      prepare: () => {
        throw new Error("D1 unavailable");
      },
      batch: async (statements) => db.batch(statements as Parameters<D1Database["batch"]>[0]),
      exec: db.exec.bind(db),
    };
    const response = await handleApiRequest(new Request("https://bycarglobal.com/api/cms"), {
      ...local.env,
      DB: broken,
    });
    expect(response?.status).toBe(503);
    await expect(getLiveCmsData({ ...local.env, DB: broken })).rejects.toThrow();
    const health = await handleApiRequest(new Request("https://bycarglobal.com/api/health"), {
      ...local.env,
      DB: broken,
    });
    expect(health?.status).toBe(503);
  });

  it("does not reapply migrations or reset existing settings on a second run", async () => {
    await local.env.DB.prepare(
      "INSERT INTO site_settings (key, value) VALUES ('replay_setting', 'preserved')",
    ).run();
    await local.env.DB.prepare(
      "UPDATE site_settings SET value = '42' WHERE key = 'cms_revision'",
    ).run();
    await local.migrate();
    expect(
      await local.env.DB.prepare(
        "SELECT value FROM site_settings WHERE key = 'cms_revision'",
      ).first("value"),
    ).toBe("42");
    expect(
      await local.env.DB.prepare("SELECT COUNT(*) AS count FROM d1_migrations").first("count"),
    ).toBe(5);
    expect(
      await local.env.DB.prepare(
        "SELECT value FROM site_settings WHERE key = 'replay_setting'",
      ).first("value"),
    ).toBe("preserved");
  });
});

describe("Persistent session mutation failures and atomic password replacement", () => {
  let local: Awaited<ReturnType<typeof createLocalDatabase>>;
  beforeEach(async () => {
    local = await createLocalDatabase();
  });
  afterEach(async () => local?.dispose());
  const login = (password = secret) =>
    handleApiRequest(post("/api/admin/login", { password }), {
      ...local.env,
      ADMIN_PASSWORD: secret,
    });
  const me = (token: string) =>
    handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/me", {
        headers: { authorization: `Bearer ${token}` },
      }),
      local.env,
    );
  async function newToken(password = secret) {
    const response = await login(password);
    expect(response?.status).toBe(200);
    return ((await response!.json()) as { token: string }).token;
  }

  it("returns a retryable error on real D1 logout failure, then revokes successfully on retry", async () => {
    const token = await newToken();
    const db = local.env.DB;
    const failingDb: ApiDatabase = {
      prepare(query) {
        return db.prepare(
          query.includes("DELETE FROM admin_sessions WHERE token_hash")
            ? "DELETE FROM admin_sessions WHERE token_hash = ? AND (SELECT value FROM synthetic_missing_fault_table) IS NULL"
            : query,
        );
      },
      batch: (statements) => db.batch(statements as Parameters<D1Database["batch"]>[0]),
      exec: db.exec.bind(db),
    };
    const failed = await handleApiRequest(post("/api/admin/logout", {}, token), {
      ...local.env,
      DB: failingDb,
    });
    expect(failed?.status).toBe(503);
    expect(await failed!.text()).not.toContain("synthetic_missing_fault_table");
    expect((await me(token))?.status).toBe(200);
    expect((await handleApiRequest(post("/api/admin/logout", {}, token), local.env))?.status).toBe(
      200,
    );
    expect((await me(token))?.status).toBe(401);
  });

  it("rolls back both the password and session deletions if any statement in the D1 batch fails", async () => {
    const token = await newToken();
    const secondToken = await newToken();
    const db = local.env.DB;
    const before = await db
      .prepare("SELECT password_hash, password_salt FROM admin_users WHERE username = 'admin'")
      .first();
    const failingDb: ApiDatabase = {
      prepare: db.prepare.bind(db),
      exec: db.exec.bind(db),
      batch: (statements) =>
        db.batch([
          ...(statements as Parameters<D1Database["batch"]>[0]),
          db.prepare(
            "INSERT INTO site_settings (key, value) VALUES (NULL, 'synthetic transaction failure')",
          ),
        ]),
    };
    const failed = await handleApiRequest(
      post("/api/admin/change-password", { newPassword: "ReplacementPassword!2026" }, token),
      { ...local.env, DB: failingDb },
    );
    expect(failed?.status).toBe(500);
    expect(
      await db
        .prepare("SELECT password_hash, password_salt FROM admin_users WHERE username = 'admin'")
        .first(),
    ).toEqual(before);
    expect((await me(token))?.status).toBe(200);
    expect((await me(secondToken))?.status).toBe(200);
    expect(
      (await handleApiRequest(post("/api/admin/login", { password: secret }), local.env))?.status,
    ).toBe(200);
    expect(
      (
        await handleApiRequest(
          post("/api/admin/login", { password: "ReplacementPassword!2026" }),
          local.env,
        )
      )?.status,
    ).toBe(401);
  });

  it("revokes all sessions for a historical non-master admin ID on successful password replacement", async () => {
    const oldPassword = "HistoricalAdminPassword!2026";
    const salt = "a1d9c587b0ef46dcac894c711f1bdcb9";
    const hash = await deriveServerPBKDF2HexWithParams(oldPassword, salt, 100000);
    await local.env.DB.prepare(
      "INSERT INTO admin_users (id, username, password_hash, password_salt) VALUES ('historical-admin-id', 'admin', ?, ?)",
    )
      .bind(hash, salt)
      .run();
    const token = await newToken(oldPassword);
    const secondToken = await newToken(oldPassword);
    const response = await handleApiRequest(
      post("/api/admin/change-password", { newPassword: "NewHistoricalPassword!2026" }, token),
      local.env,
    );
    expect(response?.status).toBe(200);
    expect(
      await local.env.DB.prepare("SELECT id FROM admin_users WHERE username = 'admin'").first("id"),
    ).toBe("historical-admin-id");
    expect(
      await local.env.DB.prepare(
        "SELECT COUNT(*) AS count FROM admin_sessions WHERE admin_id = 'historical-admin-id'",
      ).first("count"),
    ).toBe(0);
    expect((await me(token))?.status).toBe(401);
    expect((await me(secondToken))?.status).toBe(401);
    expect(
      (
        await handleApiRequest(
          post("/api/admin/login", { password: "NewHistoricalPassword!2026" }),
          local.env,
        )
      )?.status,
    ).toBe(200);
    expect(
      (await handleApiRequest(post("/api/admin/login", { password: oldPassword }), local.env))
        ?.status,
    ).toBe(401);
  });
});

describe("0002: retirement of deterministic seed credentials", () => {
  let local: Awaited<ReturnType<typeof createLocalDatabase>>;
  const oldPassword = "SyntheticOldSeedPassword!2026";
  const customPassword = "SyntheticCustomPassword!2026";
  const legacySalt = "bycar-global-vip-salt-2026";
  const customSalt = "e5dfd514b2c14f27aa52e51e1ddbaab9";
  let customHash: string;
  let oldToken: string;
  let customToken: string;

  const login = (password: string, username = "admin") =>
    handleApiRequest(post("/api/admin/login", { password, username }), {
      ...local.env,
      ADMIN_PASSWORD: secret,
    });
  const me = (token: string) =>
    handleApiRequest(
      new Request("https://bycarglobal.com/api/admin/me", {
        headers: { authorization: `Bearer ${token}` },
      }),
      local.env,
    );

  beforeAll(async () => {
    // Exercise a database where 0000/0001 are already recorded as applied.
    local = await createLocalDatabase("before-seed-repair");
    const legacyHash = await deriveServerPBKDF2HexWithParams(oldPassword, legacySalt, 100000);
    customHash = await deriveServerPBKDF2HexWithParams(customPassword, customSalt, 100000);
    await local.env.DB.batch([
      local.env.DB.prepare(
        "INSERT INTO admin_users (id, username, password_hash, password_salt) VALUES ('admin-master', 'admin', ?, ?)",
      ).bind(legacyHash, legacySalt),
      local.env.DB.prepare(
        "INSERT INTO admin_users (id, username, password_hash, password_salt) VALUES ('another-seed', 'legacy-secondary', ?, ?)",
      ).bind(legacyHash, legacySalt),
      local.env.DB.prepare(
        "INSERT INTO admin_users (id, username, password_hash, password_salt) VALUES ('custom-admin', 'custom', ?, ?)",
      ).bind(customHash, customSalt),
      local.env.DB.prepare(
        "INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES ('secondary-session', 'another-seed', 'secondary-session-hash', datetime('now', '+1 day'))",
      ),
      local.env.DB.prepare("UPDATE site_settings SET value = '51' WHERE key = 'cms_revision'"),
    ]);
    // Reproduce the report: env login must not overwrite the row, so it also
    // cannot retire historical seed credentials without this data migration.
    expect((await login(secret))?.status).toBe(200);
    expect(
      await local.env.DB.prepare(
        "SELECT password_salt FROM admin_users WHERE id = 'admin-master'",
      ).first("password_salt"),
    ).toBe(legacySalt);
    const legacyLogin = await login(oldPassword);
    expect(legacyLogin?.status).toBe(200);
    oldToken = ((await legacyLogin!.json()) as { token: string }).token;
    const customLogin = await login(customPassword, "custom");
    expect(customLogin?.status).toBe(200);
    customToken = ((await customLogin!.json()) as { token: string }).token;
    await local.env.BUCKET.put("vehicles/seed-repair/keep.png", "keep-media");
    await local.migrate();
  });
  afterAll(async () => local?.dispose());

  it("removes every legacy seed account and its sessions, preserving custom credentials and unrelated data", async () => {
    const db = local.env.DB;
    expect(
      await db
        .prepare("SELECT COUNT(*) AS count FROM admin_users WHERE password_salt = ?")
        .bind(legacySalt)
        .first("count"),
    ).toBe(0);
    expect(
      await db
        .prepare(
          "SELECT COUNT(*) AS count FROM admin_sessions WHERE admin_id IN ('admin-master', 'another-seed')",
        )
        .first("count"),
    ).toBe(0);
    expect(
      await db
        .prepare("SELECT password_hash, password_salt FROM admin_users WHERE id = 'custom-admin'")
        .first(),
    ).toEqual({ password_hash: customHash, password_salt: customSalt });
    expect((await me(oldToken))?.status).toBe(401);
    expect((await me(customToken))?.status).toBe(200);
    expect((await login(customPassword, "custom"))?.status).toBe(200);
    expect(
      await db.prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'").first("value"),
    ).toBe("51");
    expect(await (await local.env.BUCKET.get("vehicles/seed-repair/keep.png"))?.text()).toBe(
      "keep-media",
    );
    expect((await db.prepare("PRAGMA foreign_key_check").all()).results).toEqual([]);
  });

  it("rejects the old password and allows env login to provision a fresh random-salt admin without reviving old sessions", async () => {
    expect((await login(oldPassword))?.status).toBe(401);
    const freshLogin = await login(secret);
    expect(freshLogin?.status).toBe(200);
    const freshToken = ((await freshLogin!.json()) as { token: string }).token;
    const row = await local.env.DB.prepare(
      "SELECT id, password_salt FROM admin_users WHERE username = 'admin'",
    ).first<{ id: string; password_salt: string }>();
    expect(row?.id).toBe("admin-master");
    expect(row?.password_salt).toMatch(/^[a-f0-9]{32}$/);
    expect(row?.password_salt).not.toBe(legacySalt);
    expect((await me(freshToken))?.status).toBe(200);
    expect((await me(oldToken))?.status).toBe(401);
    expect((await login(oldPassword))?.status).toBe(401);

    // A panel password set after recovery must survive subsequent env logins
    // and a second migration apply, which must be a no-op.
    const panelPassword = "NewPanelPasswordAfterRecovery!2026";
    const change = await handleApiRequest(
      post(
        "/api/admin/change-password",
        { currentPassword: secret, newPassword: panelPassword },
        freshToken,
      ),
      local.env,
    );
    expect(change?.status).toBe(200);
    expect((await me(freshToken))?.status).toBe(401);
    const updated = await local.env.DB.prepare(
      "SELECT password_hash, password_salt FROM admin_users WHERE id = 'admin-master'",
    ).first();
    expect((await login(secret))?.status).toBe(200);
    await local.migrate();
    expect(
      await local.env.DB.prepare(
        "SELECT password_hash, password_salt FROM admin_users WHERE id = 'admin-master'",
      ).first(),
    ).toEqual(updated);
    expect((await login(panelPassword))?.status).toBe(200);
    expect((await login(oldPassword))?.status).toBe(401);
    expect(
      await local.env.DB.prepare("SELECT COUNT(*) AS count FROM d1_migrations").first("count"),
    ).toBe(5);
  });
});

describe("0004: ByCar Etiler content migration", () => {
  let local: Awaited<ReturnType<typeof createLocalDatabase>>;
  const previousConfig = {
    contact: {
      email: "info@bycarglobal.com",
      instagramUrl: "https://instagram.com/bycarglobal",
      phone: "+905551234567",
      address: "Özel adres",
      whatsappOfferTemplate: "Merhaba ByCar Global, {car}",
    },
    about: { storyTr: "ByCar Global: özel seçim — Türkçe 👋", storyEn: "BYCAR GLOBAL collection" },
    seo: { metaTitleTr: "Sahibinin özel SEO başlığı", metaDescTr: "ByCar Global seçkisi" },
  };
  beforeAll(async () => {
    local = await createLocalDatabase("before-rebrand");
    await createDatabase(local.env.DB)
      .insert(vehicles)
      .values({
        ...car,
        power: "",
        color: "",
        package: "",
        expertise: "",
        description_tr: "ByCar Global özel aracı",
        description_en: "ByCar Global car",
      });
    await local.env.DB.batch([
      local.env.DB.prepare("UPDATE site_settings SET value = '41' WHERE key = 'cms_revision'"),
      local.env.DB.prepare(
        "INSERT INTO site_settings (key,value) VALUES ('cms_config', ?), ('custom_setting','keep')",
      ).bind(JSON.stringify(previousConfig)),
      local.env.DB.prepare(
        "INSERT INTO admin_users (id,username,password_hash,password_salt) VALUES ('owner','owner','unchanged-hash','unchanged-salt')",
      ),
      local.env.DB.prepare(
        "INSERT INTO admin_sessions (id,admin_id,token_hash,expires_at) VALUES ('session','owner','unchanged-token','2099-01-01')",
      ),
      local.env.DB.prepare(
        "INSERT INTO inquiries (id,type,vehicle_id,car_title,customer_name,phone,offer_or_budget) VALUES ('history','Teklif',?,'ByCar Global historical title','Test','555','Info')",
      ).bind(car.id),
      local.env.DB.prepare(
        "INSERT INTO vehicle_images (id,vehicle_id,r2_key,public_url) VALUES ('photo',?,'vehicles/original.webp','/api/media/vehicles/original.webp')",
      ).bind(car.id),
    ]);
    await local.env.BUCKET.put("vehicles/original.webp", "original-bytes");
    await local.migrate();
  });
  afterAll(async () => local?.dispose());

  it("renames stored content and invalidates stale editors, preserving contact details, credentials, customer history and R2", async () => {
    const db = local.env.DB;
    const config = JSON.parse(
      (await db
        .prepare("SELECT value FROM site_settings WHERE key='cms_config'")
        .first<string>("value")) || "{}",
    );
    expect(config.about.storyTr).toBe("ByCar Etiler: özel seçim — Türkçe 👋");
    expect(config.about.storyEn).toBe("BYCAR ETİLER collection");
    expect(config.contact).toEqual({
      ...previousConfig.contact,
      whatsappOfferTemplate: "Merhaba ByCar Etiler, {car}",
    });
    expect(config.seo.metaTitleTr).toBe(previousConfig.seo.metaTitleTr);
    expect(
      await db.prepare("SELECT value FROM site_settings WHERE key='cms_revision'").first("value"),
    ).toBe("42");
    expect(
      await db
        .prepare("SELECT description_tr FROM vehicles WHERE id=?")
        .bind(car.id)
        .first("description_tr"),
    ).toBe("ByCar Etiler özel aracı");
    expect(
      await db
        .prepare("SELECT password_hash FROM admin_users WHERE id='owner'")
        .first("password_hash"),
    ).toBe("unchanged-hash");
    expect(
      await db
        .prepare("SELECT token_hash FROM admin_sessions WHERE id='session'")
        .first("token_hash"),
    ).toBe("unchanged-token");
    expect(
      await db.prepare("SELECT car_title FROM inquiries WHERE id='history'").first("car_title"),
    ).toBe("ByCar Global historical title");
    expect(
      await db.prepare("SELECT r2_key FROM vehicle_images WHERE id='photo'").first("r2_key"),
    ).toBe("vehicles/original.webp");
    expect(await (await local.env.BUCKET.get("vehicles/original.webp"))?.text()).toBe(
      "original-bytes",
    );
    expect((await db.prepare("PRAGMA foreign_key_check").all()).results).toEqual([]);
  });

  it("does not replay the content repair or bump the revision on migration reapplication", async () => {
    await local.migrate();
    expect(
      await local.env.DB.prepare("SELECT value FROM site_settings WHERE key='cms_revision'").first(
        "value",
      ),
    ).toBe("42");
  });

  it("rolls back config and revision if a later vehicle update fails", async () => {
    const failure = await createLocalDatabase("before-rebrand");
    try {
      await createDatabase(failure.env.DB)
        .insert(vehicles)
        .values({
          ...car,
          power: "",
          color: "",
          package: "",
          expertise: "",
          description_tr: "ByCar Global",
        });
      await failure.env.DB.batch([
        failure.env.DB.prepare("UPDATE site_settings SET value='8' WHERE key='cms_revision'"),
        failure.env.DB.prepare(
          "INSERT INTO site_settings (key,value) VALUES ('cms_config',?)",
        ).bind(JSON.stringify(previousConfig)),
      ]);
      await failure.env.DB.prepare(
        "CREATE TRIGGER fail_rebrand BEFORE UPDATE ON vehicles BEGIN SELECT RAISE(ABORT, 'rebrand-failure'); END",
      ).run();
      await expect(failure.migrate()).rejects.toThrow();
      expect(
        await failure.env.DB.prepare(
          "SELECT value FROM site_settings WHERE key='cms_revision'",
        ).first("value"),
      ).toBe("8");
      expect(
        JSON.parse(
          (await failure.env.DB.prepare(
            "SELECT value FROM site_settings WHERE key='cms_config'",
          ).first<string>("value")) || "{}",
        ),
      ).toEqual(previousConfig);
      expect(
        await failure.env.DB.prepare(
          "SELECT COUNT(*) AS count FROM d1_migrations WHERE name='0004_bycaretiler_brand.sql'",
        ).first("count"),
      ).toBe(0);
    } finally {
      await failure.dispose();
    }
  });
});

describe("Unmigrated database", () => {
  let local: Awaited<ReturnType<typeof createLocalDatabase>>;
  beforeAll(async () => {
    local = await createLocalDatabase("empty");
  });
  afterAll(async () => local?.dispose());

  it("fails login without creating or repairing tables from the request handler", async () => {
    const response = await handleApiRequest(post("/api/admin/login", { password: secret }), {
      ...local.env,
      ADMIN_PASSWORD: secret,
    });
    expect(response?.status).toBe(500);
    const tables = await local.env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('vehicles', 'admin_users', 'site_settings', 'admin_sessions')",
    ).all();
    expect(tables.results).toEqual([]);
  });
});

describe("Upgrade from the pre-migration production schema", () => {
  let local: Awaited<ReturnType<typeof createLocalDatabase>>;
  beforeAll(async () => {
    local = await createLocalDatabase(true);
    await local.env.DB.batch([
      local.env.DB.prepare("UPDATE site_settings SET value = '27' WHERE key = 'cms_revision'"),
      local.env.DB.prepare(
        "INSERT INTO site_settings (key, value) VALUES (NULL, 'old-cas-artifact'), ('custom_setting', 'keep-me')",
      ),
      local.env.DB.prepare(
        "INSERT INTO admin_users (id, username, password_hash, password_salt) VALUES ('legacy-admin', 'legacy', 'keep-hash', 'keep-salt')",
      ),
      local.env.DB.prepare(
        "INSERT INTO vehicles (id, slug, brand, title, year, fuel, gear, body, power, color, package, expertise) VALUES ('legacy-car', 'legacy-car', 'BMW', 'M5', 2020, 'Benzin', 'Otomatik', 'Sedan', '', '', '', '')",
      ),
      local.env.DB.prepare(
        "INSERT INTO vehicle_images (id, vehicle_id, r2_key, public_url) VALUES ('legacy-image', 'legacy-car', 'vehicles/legacy/old.png', '/old.png')",
      ),
    ]);
    await local.env.BUCKET.put("vehicles/legacy/old.png", "existing-media");
    // Deployed databases may have runtime-added triggers and still lack NOT NULL.
    const integrityMigration = await readFile(
      path.join(root, "drizzle/0001_site_settings_integrity.sql"),
      "utf8",
    );
    for (const statement of integrityMigration.split("--> statement-breakpoint")) {
      if (statement.trim().startsWith("CREATE TRIGGER")) {
        await local.env.DB.prepare(statement).run();
      }
    }
    await local.migrate();
  });
  afterAll(async () => local?.dispose());

  it("preserves existing revision, settings, credentials, catalog and R2 media while repairing NULL keys", async () => {
    const db = local.env.DB;
    expect(
      await db.prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'").first("value"),
    ).toBe("27");
    expect(
      await db
        .prepare("SELECT value FROM site_settings WHERE key = 'custom_setting'")
        .first("value"),
    ).toBe("keep-me");
    expect(
      await db
        .prepare("SELECT password_hash FROM admin_users WHERE id = 'legacy-admin'")
        .first("password_hash"),
    ).toBe("keep-hash");
    expect(
      await db
        .prepare("SELECT r2_key FROM vehicle_images WHERE id = 'legacy-image'")
        .first("r2_key"),
    ).toBe("vehicles/legacy/old.png");
    expect(
      await local.env.DB.prepare("SELECT sort_order FROM vehicles WHERE id = 'legacy-car'").first(
        "sort_order",
      ),
    ).toBe(0);
    expect(await (await local.env.BUCKET.get("vehicles/legacy/old.png"))?.text()).toBe(
      "existing-media",
    );
    expect(await db.prepare("SELECT key FROM site_settings WHERE key IS NULL").first()).toBeNull();
    const columns = await db
      .prepare("PRAGMA table_info(site_settings)")
      .all<{ name: string; notnull: number }>();
    expect(columns.results.find((c) => c.name === "key")?.notnull).toBe(1);
    await expect(
      db.prepare("INSERT INTO site_settings (key, value) VALUES (NULL, 'bad')").run(),
    ).rejects.toThrow();
    await expect(
      db.prepare("UPDATE site_settings SET key = NULL WHERE key = 'custom_setting'").run(),
    ).rejects.toThrow();
    expect((await db.prepare("PRAGMA foreign_key_check").all()).results).toEqual([]);
  });
});
