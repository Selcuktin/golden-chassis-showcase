// ByCar Global — Cloudflare D1 Server API & Synchronization Engine
// Handles /api/cms, /api/inquiry, /api/health with automatic Cloudflare D1 SQL binding

export type D1Database = {
  prepare: (query: string) => {
    bind: (...args: unknown[]) => {
      all: <T = unknown>() => Promise<{ results: T[]; success: boolean }>;
      run: () => Promise<{ success: boolean; meta?: unknown }>;
      first: <T = unknown>(col?: string) => Promise<T | null>;
    };
    all: <T = unknown>() => Promise<{ results: T[]; success: boolean }>;
    run: () => Promise<{ success: boolean; meta?: unknown }>;
    first: <T = unknown>(col?: string) => Promise<T | null>;
  };
  batch: (statements: unknown[]) => Promise<unknown[]>;
  exec: (query: string) => Promise<{ count: number; duration: number }>;
};

// In-Memory store fallback when D1 is not bound (e.g. local dev server)
let memoryStore: {
  cars?: unknown[];
  inquiries?: unknown[];
  settings?: unknown;
  cmsConfig?: unknown;
} = {};

const D1_INIT_SQL = `
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  km INTEGER NOT NULL DEFAULT 0,
  fuel TEXT NOT NULL,
  gear TEXT NOT NULL,
  body TEXT NOT NULL,
  power TEXT NOT NULL,
  color TEXT NOT NULL,
  package TEXT NOT NULL,
  expertise TEXT NOT NULL,
  tramer TEXT NOT NULL DEFAULT 'Yok',
  image_fit TEXT NOT NULL DEFAULT 'cover',
  video_url TEXT,
  extras_json TEXT NOT NULL DEFAULT '[]',
  extras_en_json TEXT NOT NULL DEFAULT '[]',
  description_tr TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  is_featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_images (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  is_cover INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  vehicle_id TEXT,
  car_title TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  offer_or_budget TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'Yeni',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

let d1Initialized = false;

async function ensureD1Tables(db: D1Database) {
  if (d1Initialized) return;
  try {
    await db.exec(D1_INIT_SQL);
    d1Initialized = true;
  } catch (err) {
    console.error("D1 schema init error:", err);
  }
}

export async function handleApiRequest(
  request: Request,
  env: unknown,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;

  const db = (env as { DB?: D1Database })?.DB;
  const isD1 = Boolean(db);

  // 1. GET /api/health
  if (url.pathname === "/api/health" && request.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ok",
        d1: isD1,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }

  // 2. GET /api/cms — Load all cars, inquiries, settings, and CMS config
  if (url.pathname === "/api/cms" && request.method === "GET") {
    if (db) {
      await ensureD1Tables(db);
      try {
        const vehiclesRes = await db
          .prepare("SELECT * FROM vehicles ORDER BY is_featured DESC, updated_at DESC")
          .all<Record<string, unknown>>();

        const imagesRes = await db
          .prepare("SELECT * FROM vehicle_images ORDER BY vehicle_id, sort_order ASC")
          .all<Record<string, unknown>>();

        const inquiriesRes = await db
          .prepare("SELECT * FROM inquiries ORDER BY created_at DESC")
          .all<Record<string, unknown>>();

        const settingsRes = await db
          .prepare("SELECT * FROM site_settings")
          .all<{ key: string; value: string }>();

        // Reconstruct vehicles with their images array
        const imagesMap = new Map<string, string[]>();
        for (const row of imagesRes.results || []) {
          const vId = String(row.vehicle_id);
          const pUrl = String(row.public_url);
          if (!imagesMap.has(vId)) imagesMap.set(vId, []);
          imagesMap.get(vId)!.push(pUrl);
        }

        const cars = (vehiclesRes.results || []).map((row) => ({
          id: String(row.id),
          brand: String(row.brand),
          title: String(row.title),
          year: Number(row.year),
          km: Number(row.km),
          fuel: String(row.fuel),
          gear: String(row.gear),
          body: String(row.body),
          specs: {
            power: String(row.power),
            color: String(row.color),
            package: String(row.package),
            expertise: String(row.expertise),
            tramer: String(row.tramer || "Yok"),
          },
          imageFit: row.image_fit === "contain" ? "contain" : "cover",
          images: imagesMap.get(String(row.id)) || [],
          video: row.video_url ? String(row.video_url) : undefined,
          extras: JSON.parse(String(row.extras_json || "[]")),
          extrasEn: JSON.parse(String(row.extras_en_json || "[]")),
          description: {
            tr: String(row.description_tr || ""),
            en: String(row.description_en || ""),
          },
          status: String(row.status || "active"),
          featured: Boolean(row.is_featured),
        }));

        const inquiries = (inquiriesRes.results || []).map((row) => ({
          id: String(row.id),
          type: String(row.type),
          car: String(row.car_title),
          name: String(row.customer_name),
          phone: String(row.phone),
          offerOrBudget: String(row.offer_or_budget),
          details: row.details ? String(row.details) : undefined,
          status: String(row.status || "Yeni"),
          time: String(row.created_at || "Yeni"),
        }));

        const settingsMap: Record<string, unknown> = {};
        for (const s of settingsRes.results || []) {
          try {
            settingsMap[s.key] = JSON.parse(s.value);
          } catch {
            settingsMap[s.key] = s.value;
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            source: "d1",
            cars: cars.length > 0 ? cars : null,
            inquiries: inquiries.length > 0 ? inquiries : null,
            settings: settingsMap.showcase_settings || null,
            cmsConfig: settingsMap.cms_config || null,
          }),
          { headers: { "content-type": "application/json; charset=utf-8" } },
        );
      } catch (err) {
        console.error("D1 Read error:", err);
      }
    }

    // Fallback: In-memory store
    return new Response(
      JSON.stringify({
        ok: true,
        source: "memory",
        cars: memoryStore.cars || null,
        inquiries: memoryStore.inquiries || null,
        settings: memoryStore.settings || null,
        cmsConfig: memoryStore.cmsConfig || null,
      }),
      { headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }

  // 3. POST /api/cms — Sync entire CMS state to D1 & Memory
  if (url.pathname === "/api/cms" && request.method === "POST") {
    try {
      const payload = (await request.json()) as {
        cars?: Record<string, unknown>[];
        inquiries?: Record<string, unknown>[];
        settings?: unknown;
        cmsConfig?: unknown;
      };

      memoryStore = {
        cars: payload.cars,
        inquiries: payload.inquiries,
        settings: payload.settings,
        cmsConfig: payload.cmsConfig,
      };

      if (db) {
        await ensureD1Tables(db);
        const stmts: unknown[] = [];

        // Save site_settings
        if (payload.settings) {
          stmts.push(
            db
              .prepare(
                "INSERT INTO site_settings (key, value, updated_at) VALUES ('showcase_settings', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
              )
              .bind(JSON.stringify(payload.settings)),
          );
        }

        if (payload.cmsConfig) {
          stmts.push(
            db
              .prepare(
                "INSERT INTO site_settings (key, value, updated_at) VALUES ('cms_config', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
              )
              .bind(JSON.stringify(payload.cmsConfig)),
          );
        }

        // Save vehicles & images
        if (Array.isArray(payload.cars)) {
          // Clear current vehicles and images to recreate full updated catalog
          stmts.push(db.prepare("DELETE FROM vehicle_images"));
          stmts.push(db.prepare("DELETE FROM vehicles"));

          for (const c of payload.cars) {
            const specs = (c.specs as Record<string, unknown>) || {};
            const desc = (c.description as Record<string, unknown>) || {};
            stmts.push(
              db
                .prepare(
                  `INSERT INTO vehicles (id, slug, brand, title, year, km, fuel, gear, body, power, color, package, expertise, tramer, image_fit, video_url, extras_json, extras_en_json, description_tr, description_en, status, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                )
                .bind(
                  String(c.id),
                  String(c.id),
                  String(c.brand),
                  String(c.title),
                  Number(c.year) || 2025,
                  Number(c.km) || 0,
                  String(c.fuel || "Benzin"),
                  String(c.gear || "Otomatik"),
                  String(c.body || "Coupe"),
                  String(specs.power || ""),
                  String(specs.color || ""),
                  String(specs.package || ""),
                  String(specs.expertise || ""),
                  String(specs.tramer || "Yok"),
                  c.imageFit === "contain" ? "contain" : "cover",
                  c.video ? String(c.video) : null,
                  JSON.stringify(c.extras || []),
                  JSON.stringify(c.extrasEn || []),
                  String(desc.tr || ""),
                  String(desc.en || ""),
                  String(c.status || "active"),
                  c.featured ? 1 : 0,
                ),
            );

            if (Array.isArray(c.images)) {
              c.images.forEach((imgUrl: unknown, idx: number) => {
                stmts.push(
                  db
                    .prepare(
                      `INSERT INTO vehicle_images (id, vehicle_id, r2_key, public_url, is_cover, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
                    )
                    .bind(
                      `${c.id}-img-${idx + 1}`,
                      String(c.id),
                      `vehicles/${c.id}/${idx + 1}`,
                      String(imgUrl),
                      idx === 0 ? 1 : 0,
                      idx,
                    ),
                );
              });
            }
          }
        }

        if (stmts.length > 0) {
          await db.batch(stmts);
        }
      }

      return new Response(
        JSON.stringify({
          ok: true,
          source: isD1 ? "d1" : "memory",
          message: isD1
            ? "Cloudflare D1 veritabanı başarıyla güncellendi."
            : "Sunucu hafızası güncellendi (D1 bağlı değil).",
        }),
        { headers: { "content-type": "application/json; charset=utf-8" } },
      );
    } catch (err) {
      console.error("POST /api/cms error:", err);
      return new Response(
        JSON.stringify({ ok: false, error: String(err) }),
        { status: 500, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }
  }

  // 4. POST /api/inquiry — Customer submits VIP Offer or Special Import Request
  if (url.pathname === "/api/inquiry" && request.method === "POST") {
    try {
      const body = (await request.json()) as {
        type: string;
        car: string;
        name: string;
        phone: string;
        offerOrBudget: string;
        details?: string;
        vehicleId?: string;
      };

      const inqId = `inq-${Date.now()}`;
      if (db) {
        await ensureD1Tables(db);
        await db
          .prepare(
            `INSERT INTO inquiries (id, type, vehicle_id, car_title, customer_name, phone, offer_or_budget, details, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Yeni', datetime('now'))`,
          )
          .bind(
            inqId,
            body.type || "Teklif",
            body.vehicleId || null,
            body.car,
            body.name,
            body.phone,
            body.offerOrBudget,
            body.details || null,
          )
          .run();
      }

      // Also prepend to memoryStore
      const currentInqs = (memoryStore.inquiries as unknown[]) || [];
      memoryStore.inquiries = [
        {
          id: inqId,
          type: body.type,
          car: body.car,
          name: body.name,
          phone: body.phone,
          offerOrBudget: body.offerOrBudget,
          details: body.details,
          status: "Yeni",
          time: "Az önce",
        },
        ...currentInqs,
      ];

      return new Response(
        JSON.stringify({
          ok: true,
          inquiryId: inqId,
          source: isD1 ? "d1" : "memory",
        }),
        { headers: { "content-type": "application/json; charset=utf-8" } },
      );
    } catch (err) {
      console.error("POST /api/inquiry error:", err);
      return new Response(
        JSON.stringify({ ok: false, error: String(err) }),
        { status: 500, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }
  }

  return null;
}
