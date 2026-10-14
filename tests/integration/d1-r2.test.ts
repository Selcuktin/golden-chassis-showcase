import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy, type PlatformProxy } from "wrangler";
import { handleApiRequest, type D1Database as ApiDatabase } from "../../src/server/api";
import { createDatabase } from "../../src/server/db/client";
import { siteSettings, vehicles } from "../../src/server/db/schema";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const secret = "IntegrationOnlyPassword!2026";
type Bindings = { DB: D1Database; BUCKET: R2Bucket };

async function createLocalDatabase(legacy: boolean | "empty" = false) {
  const directory = await mkdtemp(path.join(tmpdir(), "bycar-d1-test-"));
  const configPath = path.join(directory, "wrangler.json");
  const persist = path.join(directory, "state");
  const config = JSON.parse(
    await readFile(path.join(root, "tests/fixtures/wrangler.json"), "utf8"),
  );
  config.d1_databases[0].migrations_dir = path.join(root, "drizzle");
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
        "--persist-to",
        persist,
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
  } else if (legacy === false) {
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
    // Stop workerd before the CLI opens the same persisted SQLite database.
    async migrate() {
      await proxy.dispose();
      const result = await wrangler("d1", "migrations", "apply", "DB");
      this.env = await connect();
      return result.stdout;
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
    expect(await db.prepare("SELECT COUNT(*) AS count FROM d1_migrations").first("count")).toBe(2);
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
    ).toBe(2);
    expect(
      await local.env.DB.prepare(
        "SELECT value FROM site_settings WHERE key = 'replay_setting'",
      ).first("value"),
    ).toBe("preserved");
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
