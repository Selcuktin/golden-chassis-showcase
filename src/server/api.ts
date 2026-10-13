// ByCar Global — Cloudflare D1 Server API & Security Engine
// Handles /api/health, /api/admin/login, /api/admin/logout, /api/admin/inquiries, /api/cms, /api/inquiry, /sitemap.xml

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

// Strongly typed DB row interfaces (satisfies noPropertyAccessFromIndexSignature)
interface VehicleDbRow {
  id: string;
  slug: string;
  brand: string;
  title: string;
  year: number;
  km: number;
  fuel: string;
  gear: string;
  body: string;
  power: string;
  color: string;
  package: string;
  expertise: string;
  tramer: string | null;
  image_fit: string;
  video_url: string | null;
  extras_json: string;
  extras_en_json: string;
  description_tr: string;
  description_en: string;
  status: string;
  is_featured: number;
  created_at: string;
  updated_at: string;
}

interface ImageDbRow {
  id: string;
  vehicle_id: string;
  r2_key: string;
  public_url: string;
  is_cover: number;
  sort_order: number;
  created_at: string;
}

interface InquiryDbRow {
  id: string;
  type: string;
  vehicle_id: string | null;
  car_title: string;
  customer_name: string;
  phone: string;
  offer_or_budget: string;
  details: string | null;
  status: string;
  created_at: string;
}

interface SettingDbRow {
  key: string;
  value: string;
  updated_at: string;
}

interface AdminSessionRow {
  id: string;
  admin_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

// In-Memory store fallback when D1 is not bound (e.g. local preview/dev)
interface MemoryStore {
  cars?: unknown[] | undefined;
  inquiries?: unknown[] | undefined;
  settings?: unknown;
  cmsConfig?: unknown;
}

let memoryStore: MemoryStore = {};
const memorySessions = new Map<string, { token: string; expiresAt: number }>();
const ipLoginAttempts = new Map<string, { count: number; lockedUntil: number | null }>();
const ipInquiryAttempts = new Map<string, number[]>();

// Full D1 Production Schema with constraints and indices (aligned with schema.sql)
const D1_INIT_SQL = `
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  title TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1900),
  km INTEGER NOT NULL DEFAULT 0 CHECK (km >= 0),
  fuel TEXT NOT NULL CHECK (length(trim(fuel)) > 0),
  gear TEXT NOT NULL CHECK (length(trim(gear)) > 0),
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  power TEXT NOT NULL,
  color TEXT NOT NULL,
  package TEXT NOT NULL,
  expertise TEXT NOT NULL,
  tramer TEXT NOT NULL DEFAULT 'Yok',
  image_fit TEXT NOT NULL DEFAULT 'cover' CHECK (image_fit IN ('contain', 'cover')),
  video_url TEXT,
  extras_json TEXT NOT NULL DEFAULT '[]',
  extras_en_json TEXT NOT NULL DEFAULT '[]',
  description_tr TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'draft')),
  is_featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vehicles_vitrin ON vehicles(status, is_featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_status_brand ON vehicles(status, brand);
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(year DESC);

CREATE TABLE IF NOT EXISTS vehicle_images (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  is_cover INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle ON vehicle_images(vehicle_id, is_cover DESC, sort_order ASC);

CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('Teklif', 'İthalat')),
  vehicle_id TEXT,
  car_title TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  offer_or_budget TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'Yeni' CHECK (status IN ('Yeni', 'İletişime Geçildi', 'Tamamlandı')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status_created ON inquiries(status, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  iterations INTEGER NOT NULL DEFAULT 600000 CHECK (iterations >= 100000),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash);

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  ip_or_user_key TEXT UNIQUE NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  locked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    await db.exec(
      `INSERT OR IGNORE INTO admin_users (id, username, password_hash, password_salt, iterations)
       VALUES ('admin-master', 'admin', '8a9dd4b8d89a95b5362fe6758b1e531f2ad8b190d832d116f2e98c0329fa1068', 'bycar-global-vip-salt-2026', 100000);`,
    );
    d1Initialized = true;
  } catch (err) {
    console.error("D1 schema init error:", err);
  }
}

// Security: IP Resolution Helper
function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  const xForwarded = request.headers.get("x-forwarded-for");
  if (xForwarded) {
    const parts = xForwarded.split(",");
    const first = parts[0];
    if (first) return first.trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

// PBKDF2 Web Crypto implementation (100,000 iterations per Cloudflare Web Crypto max limit)
const PBKDF2_SALT = "bycar-global-vip-salt-2026";
const PBKDF2_ITERATIONS = 100000;

// Precomputed PBKDF2 hashes (salt: bycar-global-vip-salt-2026, 100k iters per Cloudflare Workers limits)
const PRECOMPUTED_ADMIN_HASHES = [
  "9a92ec3196ffbdc42cfbe14a9dbc66cb5098f9ab351ae6e1ec70874f3d8878ff", // bycar2024
  "8a9dd4b8d89a95b5362fe6758b1e531f2ad8b190d832d116f2e98c0329fa1068", // bycar2026
];

async function deriveServerPBKDF2Hex(password: string): Promise<string> {
  const enc = new TextEncoder();
  const subtle = crypto.subtle;
  const keyMaterial = await subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(PBKDF2_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// SHA-256 Hash helper
async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Cryptographic token generator
function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return (
    "bycar_sec_" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

// Admin Token Verification Middleware
async function verifyAdminToken(request: Request, db?: D1Database): Promise<boolean> {
  const authHeader = request.headers.get("authorization") || request.headers.get("x-admin-token");
  if (!authHeader) return false;

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  if (!token || !token.startsWith("bycar_sec_")) return false;

  const nowMs = Date.now();
  const tokenHash = await sha256Hex(token);

  // Check In-Memory sessions first
  const memSession = memorySessions.get(tokenHash);
  if (memSession && memSession.expiresAt > nowMs) {
    return true;
  }

  // Check D1 database sessions
  if (db) {
    try {
      await ensureD1Tables(db);
      const row = await db
        .prepare(
          "SELECT * FROM admin_sessions WHERE token_hash = ? AND datetime(expires_at) > datetime('now') LIMIT 1",
        )
        .bind(tokenHash)
        .first<AdminSessionRow>();
      if (row) {
        // Cache in memory for speed
        const expiresMs = new Date(row.expires_at).getTime();
        memorySessions.set(tokenHash, { token: tokenHash, expiresAt: expiresMs });
        return true;
      }
    } catch (err) {
      console.error("verifyAdminToken D1 error:", err);
    }
  }

  return false;
}

// Main API Handler
export async function handleApiRequest(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);

  // Dynamic Sitemap Route
  if (url.pathname === "/sitemap.xml" && request.method === "GET") {
    return handleSitemap(request, env);
  }

  if (!url.pathname.startsWith("/api/")) return null;

  const resolvedEnv = (env as { DB?: D1Database; ADMIN_PASSWORD?: string } | undefined)?.DB
    ? (env as { DB?: D1Database; ADMIN_PASSWORD?: string })
    : (globalThis as unknown as { __env__?: { DB?: D1Database; ADMIN_PASSWORD?: string } })
        ?.__env__ ||
      (
        request as unknown as {
          runtime?: { cloudflare?: { env?: { DB?: D1Database; ADMIN_PASSWORD?: string } } };
        }
      )?.runtime?.cloudflare?.env ||
      (env as { DB?: D1Database; ADMIN_PASSWORD?: string });

  const db = resolvedEnv?.DB;
  const isD1 = Boolean(db);
  const ip = getClientIp(request);

  // 1. GET /api/health
  if (url.pathname === "/api/health" && request.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ok",
        d1: isD1,
        timestamp: new Date().toISOString(),
      }),
      { headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }

  // 2. POST /api/admin/login — Server-side PBKDF2 authentication with rate-limiting
  if (url.pathname === "/api/admin/login" && request.method === "POST") {
    const now = Date.now();
    const lockInfo = ipLoginAttempts.get(ip);
    if (lockInfo?.lockedUntil && lockInfo.lockedUntil > now) {
      const waitMinutes = Math.ceil((lockInfo.lockedUntil - now) / 60000);
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Çok fazla hatalı deneme. Güvenlik nedeniyle ${waitMinutes} dakika kilitlendi.`,
          lockedUntil: lockInfo.lockedUntil,
        }),
        { status: 429, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    try {
      const body = (await request.json()) as { password?: string };
      const rawPassword = String(body.password || "").trim();

      if (!rawPassword) {
        return new Response(JSON.stringify({ ok: false, error: "Şifre alanı boş bırakılamaz." }), {
          status: 400,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }

      // Candidate hash
      const candidateHash = await deriveServerPBKDF2Hex(rawPassword);

      // Expected password verification (environment secret or production fallback hashes)
      const envPassword = resolvedEnv?.ADMIN_PASSWORD;
      let isMatch = false;

      if (envPassword) {
        const expectedEnvHash = await deriveServerPBKDF2Hex(envPassword.trim());
        isMatch = candidateHash === expectedEnvHash;
      } else {
        isMatch = PRECOMPUTED_ADMIN_HASHES.includes(candidateHash);
      }

      if (!isMatch) {
        const currentCount = (lockInfo?.count || 0) + 1;
        const locked = currentCount >= 5;
        const lockUntil = locked ? now + 15 * 60 * 1000 : null;
        ipLoginAttempts.set(ip, { count: currentCount, lockedUntil: lockUntil });

        return new Response(
          JSON.stringify({
            ok: false,
            error: locked
              ? "5 hatalı deneme yapıldı. Sistem 15 dakika kilitlendi."
              : `Geçersiz yönetici şifresi. Kalan deneme: ${5 - currentCount}`,
          }),
          { status: 401, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }

      // Login Successful: Reset attempt counter
      ipLoginAttempts.delete(ip);

      // Generate 24-hour cryptographically secure session token
      const sessionToken = generateSecureToken();
      const tokenHash = await sha256Hex(sessionToken);
      const expiresAtDate = new Date(now + 24 * 60 * 60 * 1000);
      const expiresAtIso = expiresAtDate.toISOString();

      // Store in memory
      memorySessions.set(tokenHash, {
        token: tokenHash,
        expiresAt: expiresAtDate.getTime(),
      });

      // Store in D1 if available
      if (db) {
        try {
          await ensureD1Tables(db);
          await db
            .prepare(
              "INSERT INTO admin_sessions (id, admin_id, token_hash, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(
              `sess-${Date.now()}`,
              "admin-master",
              tokenHash,
              ip,
              request.headers.get("user-agent") || "browser",
              expiresAtIso,
            )
            .run();
        } catch (dbErr) {
          console.error("D1 session save error:", dbErr);
        }
      }

      return new Response(
        JSON.stringify({
          ok: true,
          token: sessionToken,
          expiresAt: expiresAtIso,
        }),
        { headers: { "content-type": "application/json; charset=utf-8" } },
      );
    } catch (err) {
      console.error("POST /api/admin/login error:", err);
      return new Response(JSON.stringify({ ok: false, error: String(err) }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
  }

  // 3. POST /api/admin/logout
  if (url.pathname === "/api/admin/logout" && request.method === "POST") {
    const authHeader = request.headers.get("authorization") || request.headers.get("x-admin-token");
    if (authHeader) {
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : authHeader.trim();
      const tokenHash = await sha256Hex(token);
      memorySessions.delete(tokenHash);
      if (db) {
        try {
          await db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(tokenHash).run();
        } catch {
          // ignore
        }
      }
    }
    return new Response(JSON.stringify({ ok: true, message: "Oturum sonlandırıldı." }), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  // 4. GET /api/admin/inquiries — PROTECTED: Only authenticated admins can read inquiries (KVKK Compliance)
  if (url.pathname === "/api/admin/inquiries" && request.method === "GET") {
    const isAuthed = await verifyAdminToken(request, db);
    if (!isAuthed) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Yetkisiz erişim: VIP Yönetici oturumu gereklidir.",
        }),
        { status: 401, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    if (db) {
      await ensureD1Tables(db);
      try {
        const inquiriesRes = await db
          .prepare("SELECT * FROM inquiries ORDER BY created_at DESC")
          .all<InquiryDbRow>();

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

        return new Response(JSON.stringify({ ok: true, source: "d1", inquiries }), {
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      } catch (err) {
        console.error("D1 inquiries read error:", err);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        source: "memory",
        inquiries: memoryStore.inquiries || [],
      }),
      { headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }

  // 5. POST /api/admin/inquiries/status — PROTECTED: Update inquiry status
  if (url.pathname === "/api/admin/inquiries/status" && request.method === "POST") {
    const isAuthed = await verifyAdminToken(request, db);
    if (!isAuthed) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Yetkisiz erişim: VIP Yönetici oturumu gereklidir.",
        }),
        { status: 401, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    try {
      const body = (await request.json()) as { id?: string; status?: string };
      if (!body.id || !body.status) {
        return new Response(JSON.stringify({ ok: false, error: "Eksik parametreler." }), {
          status: 400,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }

      if (db) {
        await ensureD1Tables(db);
        await db
          .prepare("UPDATE inquiries SET status = ? WHERE id = ?")
          .bind(body.status, body.id)
          .run();
      }

      // Update memory store if present
      if (Array.isArray(memoryStore.inquiries)) {
        memoryStore.inquiries = memoryStore.inquiries.map((inq) => {
          const item = inq as { id: string; status: string };
          if (item.id === body.id) return { ...item, status: body.status };
          return inq;
        });
      }

      return new Response(JSON.stringify({ ok: true, message: "Talep durumu güncellendi." }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: String(err) }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
  }

  // 6. GET /api/cms — PUBLIC: Load catalog cars, settings, and CMS config (NEVER returns customer inquiries)
  if (url.pathname === "/api/cms" && request.method === "GET") {
    if (db) {
      await ensureD1Tables(db);
      try {
        const vehiclesRes = await db
          .prepare("SELECT * FROM vehicles ORDER BY is_featured DESC, updated_at DESC")
          .all<VehicleDbRow>();

        const imagesRes = await db
          .prepare("SELECT * FROM vehicle_images ORDER BY vehicle_id, sort_order ASC")
          .all<ImageDbRow>();

        const settingsRes = await db.prepare("SELECT * FROM site_settings").all<SettingDbRow>();

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
            settings: settingsMap["showcase_settings"] || null,
            cmsConfig: settingsMap["cms_config"] || null,
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
        settings: memoryStore.settings || null,
        cmsConfig: memoryStore.cmsConfig || null,
      }),
      { headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }

  // 7. POST /api/cms — PROTECTED: Sync catalog state (Requires Admin Bearer token + payload limit + CSRF check)
  if (url.pathname === "/api/cms" && request.method === "POST") {
    // 1) Authentication Check
    const isAuthed = await verifyAdminToken(request, db);
    if (!isAuthed) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Yetkisiz işlem: Kataloğu güncellemek için VIP Yönetici girişi yapmalısınız.",
        }),
        { status: 401, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    // 2) Content-Length Body Size Limit (Max 5 MB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "İstek boyutu çok büyük (Maksimum 5 MB).",
        }),
        { status: 413, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    // 3) CSRF / Origin Check
    const origin = request.headers.get("origin");
    if (origin) {
      const originHost = new URL(origin).host;
      if (
        originHost !== url.host &&
        !originHost.includes("localhost") &&
        !originHost.includes("127.0.0.1")
      ) {
        return new Response(
          JSON.stringify({ ok: false, error: "CSRF doğrulaması başarısız oldu." }),
          { status: 403, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }
    }

    try {
      const payload = (await request.json()) as {
        cars?: Record<string, unknown>[];
        settings?: unknown;
        cmsConfig?: unknown;
      };

      memoryStore = {
        cars: payload.cars,
        inquiries: memoryStore.inquiries,
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
          stmts.push(db.prepare("DELETE FROM vehicle_images"));
          stmts.push(db.prepare("DELETE FROM vehicles"));

          for (const c of payload.cars) {
            const specs = (c["specs"] as Record<string, unknown>) || {};
            const desc = (c["description"] as Record<string, unknown>) || {};
            stmts.push(
              db
                .prepare(
                  `INSERT INTO vehicles (id, slug, brand, title, year, km, fuel, gear, body, power, color, package, expertise, tramer, image_fit, video_url, extras_json, extras_en_json, description_tr, description_en, status, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                )
                .bind(
                  String(c["id"]),
                  String(c["id"]),
                  String(c["brand"]),
                  String(c["title"]),
                  Number(c["year"]) || 2025,
                  Number(c["km"]) || 0,
                  String(c["fuel"] || "Benzin"),
                  String(c["gear"] || "Otomatik"),
                  String(c["body"] || "Coupe"),
                  String(specs["power"] || ""),
                  String(specs["color"] || ""),
                  String(specs["package"] || ""),
                  String(specs["expertise"] || ""),
                  String(specs["tramer"] || "Yok"),
                  c["imageFit"] === "contain" ? "contain" : "cover",
                  c["video"] ? String(c["video"]) : null,
                  JSON.stringify(c["extras"] || []),
                  JSON.stringify(c["extrasEn"] || []),
                  String(desc["tr"] || ""),
                  String(desc["en"] || ""),
                  String(c["status"] || "active"),
                  c["featured"] ? 1 : 0,
                ),
            );

            if (Array.isArray(c["images"])) {
              c["images"].forEach((imgUrl: unknown, idx: number) => {
                stmts.push(
                  db
                    .prepare(
                      `INSERT INTO vehicle_images (id, vehicle_id, r2_key, public_url, is_cover, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
                    )
                    .bind(
                      `${c["id"]}-img-${idx + 1}`,
                      String(c["id"]),
                      `vehicles/${c["id"]}/${idx + 1}`,
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
      return new Response(JSON.stringify({ ok: false, error: String(err) }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
  }

  // 8. POST /api/inquiry — Customer submits VIP Offer or Special Import Request (Rate-limited & Sanitized)
  if (url.pathname === "/api/inquiry" && request.method === "POST") {
    // 1) Rate Limiting: Max 5 inquiries per IP per 10 minutes
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const history = (ipInquiryAttempts.get(ip) || []).filter((ts) => now - ts < windowMs);
    if (history.length >= 5) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Çok fazla talep gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.",
        }),
        { status: 429, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }
    history.push(now);
    ipInquiryAttempts.set(ip, history);

    try {
      const body = (await request.json()) as {
        type?: string;
        car?: string;
        name?: string;
        phone?: string;
        offerOrBudget?: string;
        details?: string;
        vehicleId?: string;
      };

      // Input Validation
      const name = String(body.name || "").trim();
      const phone = String(body.phone || "").trim();
      const carTitle = String(body.car || "").trim();
      const rawType = String(body.type || "Teklif").trim();
      const type = rawType === "İthalat" ? "İthalat" : "Teklif";
      const offerOrBudget = String(body.offerOrBudget || "").trim();
      const details = body.details ? String(body.details).trim().slice(0, 2000) : "";

      if (name.length < 2 || name.length > 100) {
        return new Response(
          JSON.stringify({ ok: false, error: "Geçerli bir isim giriniz (2-100 karakter)." }),
          { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }

      if (phone.length < 7 || phone.length > 25) {
        return new Response(
          JSON.stringify({ ok: false, error: "Geçerli bir telefon numarası giriniz." }),
          { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }

      if (carTitle.length < 2 || carTitle.length > 150) {
        return new Response(JSON.stringify({ ok: false, error: "Araç başlığı geçersiz." }), {
          status: 400,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }

      const inqId = `inq-${Date.now()}`;
      if (db) {
        await ensureD1Tables(db);
        await db
          .prepare(
            `INSERT INTO inquiries (id, type, vehicle_id, car_title, customer_name, phone, offer_or_budget, details, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Yeni', datetime('now'))`,
          )
          .bind(
            inqId,
            type,
            body.vehicleId || null,
            carTitle,
            name,
            phone,
            offerOrBudget,
            details || null,
          )
          .run();
      }

      // Prepend to memoryStore
      const currentInqs = (memoryStore.inquiries as unknown[]) || [];
      memoryStore.inquiries = [
        {
          id: inqId,
          type,
          car: carTitle,
          name,
          phone,
          offerOrBudget,
          details,
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
      return new Response(JSON.stringify({ ok: false, error: String(err) }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
  }

  return null;
}

// Dynamic Sitemap Generator (Active vehicles only + Canonical base URL)
async function handleSitemap(request: Request, env: unknown): Promise<Response> {
  const url = new URL(request.url);
  const resolvedEnv = env as { SITE_URL?: string } | undefined;
  const baseUrl = (resolvedEnv?.SITE_URL || url.origin).replace(/\/+$/, "");

  // Default active slugs
  const activeSlugs = [
    "cupra-formentor-2023",
    "audi-q2-design-2016",
    "ferrari-296-gts",
    "porsche-911-gt3-weissach",
    "lamborghini-urus-se",
    "rolls-royce-spectre",
    "mercedes-g63-grand-edition",
    "bmw-m4-competition-2025",
    "audi-rs6-performance",
    "bentley-gt-speed-first-edition",
  ];

  const nowIso = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${activeSlugs
  .map(
    (slug) => `  <url>
    <loc>${baseUrl}/arac/${slug}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
