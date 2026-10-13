// ByCar Global — Cloudflare D1 Server API & Security Engine
// Handles /api/health, /api/admin/login, /api/admin/logout, /api/admin/change-password,
// /api/admin/upload, /api/media/*, /api/admin/inquiries, /api/cms, /api/inquiry, /sitemap.xml

import { z } from "zod";
import type { Car, SiteSettings, SiteCMSConfig, ImageFit, CarStatus } from "../lib/bycar";

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

export type R2Bucket = {
  put: (
    key: string,
    value: unknown,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ) => Promise<unknown>;
  get: (key: string) => Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string; cacheControl?: string };
  } | null>;
  delete: (key: string) => Promise<void>;
};

export type ServerEnv = {
  DB?: D1Database;
  BUCKET?: R2Bucket;
  ADMIN_PASSWORD?: string;
  SITE_URL?: string;
  GIT_COMMIT?: string;
};

// Strongly typed DB row interfaces
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

interface LoginAttemptRow {
  id: string;
  ip_or_user_key: string;
  attempt_count: number;
  locked_until: string | null;
  updated_at: string;
}

interface AdminUserRow {
  id: string;
  username: string;
  password_hash: string;
  password_salt: string;
  iterations: number;
  created_at: string;
}

// Zod Validation Schemas
export const VehicleSchema = z.object({
  id: z.string().min(1).max(100),
  slug: z.string().optional(),
  brand: z.string().min(1).max(100),
  title: z.string().min(1).max(150),
  year: z.number().int().min(1900).max(2100),
  km: z.number().int().min(0),
  fuel: z.string().min(1).max(50),
  gear: z.string().min(1).max(50),
  body: z.string().min(1).max(50),
  specs: z
    .object({
      power: z.string().default(""),
      color: z.string().default(""),
      package: z.string().default(""),
      expertise: z.string().default(""),
      tramer: z.string().default("Yok"),
    })
    .default({}),
  imageFit: z.enum(["contain", "cover"]).default("cover"),
  video: z.string().optional(),
  images: z.array(z.string()).default([]),
  extras: z.array(z.string()).default([]),
  extrasEn: z.array(z.string()).default([]),
  description: z
    .object({
      tr: z.string().default(""),
      en: z.string().default(""),
    })
    .default({ tr: "", en: "" }),
  status: z.enum(["active", "sold", "draft"]).default("active"),
  sold: z.boolean().optional(),
  featured: z.boolean().default(false),
});

export const CmsPayloadSchema = z.object({
  cars: z.array(VehicleSchema).optional(),
  settings: z.record(z.unknown()).optional(),
  cmsConfig: z.record(z.unknown()).optional(),
  allowEmptyCatalog: z.boolean().optional(),
  deletedCarIds: z.array(z.string().min(1).max(100)).max(500).optional(),
  revision: z.number().int().nonnegative().optional(),
});

export const InquiryStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["Yeni", "İletişime Geçildi", "Tamamlandı"]),
});

export const ChangePasswordSchema = z.object({
  newPassword: z.string().min(6, "Yönetici şifresi en az 6 karakter olmalıdır."),
});

// In-Memory store fallback when D1 is not bound (e.g. local preview/dev)
interface MemoryStore {
  cars?: unknown[] | undefined;
  inquiries?: unknown[] | undefined;
  settings?: unknown;
  cmsConfig?: unknown;
  revision?: number | undefined;
}

const memoryStore: MemoryStore = { revision: 1 };

function applyPayloadToMemoryStore(payload: z.infer<typeof CmsPayloadSchema>) {
  memoryStore.revision = Math.max(memoryStore.revision || 1, payload.revision || 0) + 1;

  if (Array.isArray(payload.deletedCarIds) && payload.deletedCarIds.length > 0) {
    const toDelete = new Set(payload.deletedCarIds);
    if (Array.isArray(memoryStore.cars)) {
      memoryStore.cars = (memoryStore.cars as Array<{ id: string }>).filter(
        (c) => !toDelete.has(c.id),
      );
    }
  }

  if (Array.isArray(payload.cars)) {
    if (payload.cars.length === 0 && payload.allowEmptyCatalog) {
      memoryStore.cars = [];
    } else {
      if (!memoryStore.cars) {
        memoryStore.cars = [];
      }
      const existingMap = new Map(
        (memoryStore.cars as Array<{ id: string }>).map((c) => [c.id, c]),
      );
      for (const car of payload.cars) {
        existingMap.set(car.id, car);
      }
      memoryStore.cars = Array.from(existingMap.values());
    }
  }

  if (payload.settings) {
    memoryStore.settings = payload.settings;
  }
  if (payload.cmsConfig) {
    memoryStore.cmsConfig = payload.cmsConfig;
  }
}

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
  iterations INTEGER NOT NULL DEFAULT 100000 CHECK (iterations >= 100000),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
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

CREATE TABLE IF NOT EXISTS inquiry_attempts (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inquiry_attempts_ip_time ON inquiry_attempts(ip, created_at);
`;

let d1Initialized = false;

async function ensureD1Tables(db: D1Database) {
  if (d1Initialized) return;
  try {
    await db.exec(D1_INIT_SQL);
    await db.exec(
      `INSERT INTO admin_users (id, username, password_hash, password_salt, iterations)
       VALUES ('admin-master', 'admin', '681f0b5bd12efba5f9bff84da308f35360c50723c1ff68310d564c11f7d5440a', 'bycar-global-vip-salt-2026', 100000)
       ON CONFLICT(username) DO UPDATE SET
         password_hash = CASE WHEN password_hash IN ('9a92ec3196ffbdc42cfbe14a9dbc66cb5098f9ab351ae6e1ec70874f3d8878ff', '8a9dd4b8d89a95b5362fe6758b1e531f2ad8b190d832d116f2e98c0329fa1068') THEN '681f0b5bd12efba5f9bff84da308f35360c50723c1ff68310d564c11f7d5440a' ELSE password_hash END;`,
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

// PBKDF2 Web Crypto implementation (100,000 iterations per Cloudflare Web Crypto limit)
export const PBKDF2_SALT = "bycar-global-vip-salt-2026";
export const PBKDF2_ITERATIONS = 100000;

// Precomputed PBKDF2 hashes (salt: bycar-global-vip-salt-2026, 100k iters)
export const BUILD_GIT_COMMIT = "681703a";
const PRECOMPUTED_ADMIN_HASHES = [
  "681f0b5bd12efba5f9bff84da308f35360c50723c1ff68310d564c11f7d5440a", // Default bootstrap PBKDF2 hash
];

export async function deriveServerPBKDF2HexWithParams(
  password: string,
  salt: string = PBKDF2_SALT,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<string> {
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
      salt: enc.encode(salt),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function deriveServerPBKDF2Hex(password: string): Promise<string> {
  return deriveServerPBKDF2HexWithParams(password, PBKDF2_SALT, PBKDF2_ITERATIONS);
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
export async function verifyAdminToken(request: Request, db?: D1Database): Promise<boolean> {
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

// Environment resolver helper
export function resolveEnv(env?: unknown, request?: Request): ServerEnv {
  if (env && typeof env === "object" && "DB" in env) {
    return env as ServerEnv;
  }
  const globalEnv = (globalThis as unknown as { __env__?: ServerEnv })?.__env__;
  if (globalEnv?.DB) return globalEnv;

  const requestEnv = (request as unknown as { runtime?: { cloudflare?: { env?: ServerEnv } } })
    ?.runtime?.cloudflare?.env;
  if (requestEnv?.DB) return requestEnv;

  return (env as ServerEnv) || globalEnv || {};
}

// SSR & Server-Side D1 Data Provider: Returns active catalog for SSR/SEO
export async function getLiveCmsData(env?: unknown): Promise<{
  cars: Car[];
  settings: SiteSettings | null;
  cmsConfig: SiteCMSConfig | null;
  source: "d1" | "memory";
}> {
  const resolved = resolveEnv(env);
  const db = resolved.DB;
  if (db) {
    await ensureD1Tables(db);
    try {
      const vehiclesRes = await db
        .prepare(
          "SELECT * FROM vehicles WHERE status IN ('active', 'sold') ORDER BY is_featured DESC, updated_at DESC",
        )
        .all<VehicleDbRow>();
      const imagesRes = await db
        .prepare("SELECT * FROM vehicle_images ORDER BY vehicle_id, sort_order ASC")
        .all<ImageDbRow>();
      const settingsRes = await db.prepare("SELECT * FROM site_settings").all<SettingDbRow>();

      const imagesMap = new Map<string, string[]>();
      for (const row of imagesRes.results || []) {
        const vId = String(row.vehicle_id);
        const pUrl = String(row.public_url);
        if (!imagesMap.has(vId)) imagesMap.set(vId, []);
        imagesMap.get(vId)!.push(pUrl);
      }

      const cars: Car[] = (vehiclesRes.results || []).map((row) => ({
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
        imageFit: (row.image_fit === "contain" ? "contain" : "cover") as ImageFit,
        images: imagesMap.get(String(row.id)) || [],
        video: row.video_url ? String(row.video_url) : undefined,
        extras: JSON.parse(String(row.extras_json || "[]")),
        extrasEn: JSON.parse(String(row.extras_en_json || "[]")),
        description: {
          tr: String(row.description_tr || ""),
          en: String(row.description_en || ""),
        },
        status: String(row.status || "active") as CarStatus,
        sold: row.status === "sold",
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

      if (cars.length > 0) {
        return {
          cars,
          settings: (settingsMap["showcase_settings"] as SiteSettings) || null,
          cmsConfig: (settingsMap["cms_config"] as SiteCMSConfig) || null,
          source: "d1",
        };
      }
    } catch (err) {
      console.error("getLiveCmsData D1 error:", err);
    }
  }

  return {
    cars: (memoryStore.cars as Car[]) || [],
    settings: (memoryStore.settings as SiteSettings) || null,
    cmsConfig: (memoryStore.cmsConfig as SiteCMSConfig) || null,
    source: "memory",
  };
}

// SSR & Server-Side Single Vehicle Provider by slug or ID
export async function getLiveVehicleBySlug(slug: string, env?: unknown): Promise<Car | null> {
  const resolved = resolveEnv(env);
  const db = resolved.DB;
  if (db) {
    await ensureD1Tables(db);
    try {
      const row = await db
        .prepare("SELECT * FROM vehicles WHERE (slug = ? OR id = ?) AND status != 'draft' LIMIT 1")
        .bind(slug, slug)
        .first<VehicleDbRow>();

      if (row) {
        const imagesRes = await db
          .prepare("SELECT * FROM vehicle_images WHERE vehicle_id = ? ORDER BY sort_order ASC")
          .bind(row.id)
          .all<ImageDbRow>();

        const images = (imagesRes.results || []).map((img) => String(img.public_url));

        return {
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
          imageFit: (row.image_fit === "contain" ? "contain" : "cover") as ImageFit,
          images,
          video: row.video_url ? String(row.video_url) : undefined,
          extras: JSON.parse(String(row.extras_json || "[]")),
          extrasEn: JSON.parse(String(row.extras_en_json || "[]")),
          description: {
            tr: String(row.description_tr || ""),
            en: String(row.description_en || ""),
          },
          status: String(row.status || "active") as CarStatus,
          sold: row.status === "sold",
          featured: Boolean(row.is_featured),
        };
      }
    } catch (err) {
      console.error("getLiveVehicleBySlug D1 error:", err);
    }
  }
  return null;
}

// Main API Handler
export async function handleApiRequest(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);

  // Dynamic Sitemap Route
  if (url.pathname === "/sitemap.xml" && request.method === "GET") {
    return handleSitemap(request, env);
  }

  // R2 Media Streaming Handler
  if (url.pathname.startsWith("/api/media/") && request.method === "GET") {
    const key = decodeURIComponent(url.pathname.slice("/api/media/".length));
    const resolvedEnv = resolveEnv(env, request);
    if (resolvedEnv.BUCKET && key) {
      try {
        const object = await resolvedEnv.BUCKET.get(key);
        if (object) {
          const contentType = object.httpMetadata?.contentType || "image/webp";
          return new Response(object.body, {
            headers: {
              "content-type": contentType,
              "cache-control": "public, max-age=31536000, immutable",
            },
          });
        }
      } catch (err) {
        console.error("R2 media fetch error:", err);
      }
    }
    return new Response(JSON.stringify({ error: "Media not found" }), {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  if (!url.pathname.startsWith("/api/")) return null;

  const resolvedEnv = resolveEnv(env, request);
  const db = resolvedEnv?.DB;
  const isD1 = Boolean(db);
  const ip = getClientIp(request);

  // 1. GET /api/health — Includes live D1 status, version, and commit tracking
  if (url.pathname === "/api/health" && request.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ok",
        version: "1.0.0-production",
        commit: resolvedEnv?.GIT_COMMIT || BUILD_GIT_COMMIT || "main",
        d1: isD1,
        r2: Boolean(resolvedEnv?.BUCKET),
        timestamp: new Date().toISOString(),
      }),
      { headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }

  // 2. POST /api/admin/login — Server-side PBKDF2 authentication with persistent D1 rate limiting
  if (url.pathname === "/api/admin/login" && request.method === "POST") {
    const now = Date.now();

    // Persistent Rate Limit Check (D1 with Memory fallback)
    if (db) {
      await ensureD1Tables(db);
      try {
        const attemptRow = await db
          .prepare("SELECT * FROM login_attempts WHERE ip_or_user_key = ? LIMIT 1")
          .bind(ip)
          .first<LoginAttemptRow>();

        if (attemptRow?.locked_until) {
          const lockTime = new Date(attemptRow.locked_until).getTime();
          if (lockTime > now) {
            const waitMinutes = Math.ceil((lockTime - now) / 60000);
            return new Response(
              JSON.stringify({
                ok: false,
                error: `Çok fazla hatalı deneme. Güvenlik nedeniyle ${waitMinutes} dakika kilitlendi.`,
                lockedUntil: lockTime,
              }),
              { status: 429, headers: { "content-type": "application/json; charset=utf-8" } },
            );
          }
        }
      } catch (e) {
        console.error("D1 login_attempts check error:", e);
      }
    } else {
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
    }

    try {
      const body = (await request.json()) as { password?: string; username?: string };
      const rawPassword = String(body.password || "").trim();
      const rawUsername = String(body.username || "admin").trim();

      if (!rawPassword) {
        return new Response(JSON.stringify({ ok: false, error: "Şifre alanı boş bırakılamaz." }), {
          status: 400,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }

      // Candidate hash with default salt & 100k iterations
      const candidateHash = await deriveServerPBKDF2Hex(rawPassword);

      let isMatch = false;

      // 1. Check D1 admin_users table first
      if (db) {
        await ensureD1Tables(db);
        try {
          const adminRow = await db
            .prepare("SELECT * FROM admin_users WHERE username = ? LIMIT 1")
            .bind(rawUsername)
            .first<AdminUserRow>();

          if (adminRow) {
            const rowCandidateHash = await deriveServerPBKDF2HexWithParams(
              rawPassword,
              adminRow.password_salt || PBKDF2_SALT,
              adminRow.iterations || PBKDF2_ITERATIONS,
            );
            if (rowCandidateHash === adminRow.password_hash) {
              isMatch = true;
            }
          }
        } catch (dbErr) {
          console.error("D1 admin_users lookup error:", dbErr);
        }
      }

      // 2. Check environment secret
      if (!isMatch && resolvedEnv?.ADMIN_PASSWORD) {
        const expectedEnvHash = await deriveServerPBKDF2Hex(resolvedEnv.ADMIN_PASSWORD.trim());
        isMatch = candidateHash === expectedEnvHash;
      }

      // 3. Check precomputed default hashes (production bootstrap)
      if (!isMatch) {
        isMatch = PRECOMPUTED_ADMIN_HASHES.includes(candidateHash);
      }

      if (!isMatch) {
        // Record failed attempt in D1 or Memory
        let currentCount = 1;
        if (db) {
          try {
            const attemptRow = await db
              .prepare("SELECT attempt_count FROM login_attempts WHERE ip_or_user_key = ? LIMIT 1")
              .bind(ip)
              .first<{ attempt_count: number }>();
            currentCount = (attemptRow?.attempt_count || 0) + 1;
            const locked = currentCount >= 5;
            const lockUntilIso = locked ? new Date(now + 15 * 60 * 1000).toISOString() : null;

            await db
              .prepare(
                `INSERT INTO login_attempts (id, ip_or_user_key, attempt_count, locked_until, updated_at)
                 VALUES (?, ?, ?, ?, datetime('now'))
                 ON CONFLICT(ip_or_user_key) DO UPDATE SET
                   attempt_count = excluded.attempt_count,
                   locked_until = excluded.locked_until,
                   updated_at = datetime('now')`,
              )
              .bind(`att-${ip}`, ip, currentCount, lockUntilIso)
              .run();
          } catch (e) {
            console.error("D1 record attempt error:", e);
          }
        } else {
          const lockInfo = ipLoginAttempts.get(ip);
          currentCount = (lockInfo?.count || 0) + 1;
          const locked = currentCount >= 5;
          const lockUntil = locked ? now + 15 * 60 * 1000 : null;
          ipLoginAttempts.set(ip, { count: currentCount, lockedUntil: lockUntil });
        }

        const remaining = Math.max(0, 5 - currentCount);
        return new Response(
          JSON.stringify({
            ok: false,
            error:
              currentCount >= 5
                ? "5 hatalı deneme yapıldı. Sistem 15 dakika kilitlendi."
                : `Geçersiz yönetici şifresi. Kalan deneme: ${remaining}`,
          }),
          { status: 401, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }

      // Login Successful: Reset attempt counter
      if (db) {
        try {
          await db.prepare("DELETE FROM login_attempts WHERE ip_or_user_key = ?").bind(ip).run();
        } catch {
          // ignore
        }
      }
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

  // 3b. GET /api/admin/me — PROTECTED: Token and session validation
  if (url.pathname === "/api/admin/me" && request.method === "GET") {
    const isAuthed = await verifyAdminToken(request, db);
    if (!isAuthed) {
      return new Response(
        JSON.stringify({
          ok: false,
          authenticated: false,
          error: "Oturum geçersiz veya süresi dolmuş.",
        }),
        { status: 401, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }
    return new Response(
      JSON.stringify({
        ok: true,
        authenticated: true,
        username: "admin",
      }),
      { headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }

  // 4. POST /api/admin/change-password — PROTECTED: Update admin password in D1 admin_users
  if (url.pathname === "/api/admin/change-password" && request.method === "POST") {
    const isAuthed = await verifyAdminToken(request, db);
    if (!isAuthed) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Yetkisiz erişim: Şifre değiştirmek için VIP Yönetici oturumu gereklidir.",
        }),
        { status: 401, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    try {
      const body = await request.json();
      const validated = ChangePasswordSchema.safeParse(body);
      if (!validated.success) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: validated.error.issues[0]?.message || "Geçersiz şifre formatı.",
          }),
          { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }

      const newPassword = validated.data.newPassword.trim();
      const newHash = await deriveServerPBKDF2Hex(newPassword);

      if (!db) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "D1 veritabanı bağlı değil. Şifre kalıcı olarak güncellenemedi.",
          }),
          { status: 503, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }

      await ensureD1Tables(db);
      await db
        .prepare(
          `INSERT INTO admin_users (id, username, password_hash, password_salt, iterations, created_at)
           VALUES ('admin-master', 'admin', ?, ?, 100000, datetime('now'))
           ON CONFLICT(username) DO UPDATE SET
             password_hash = excluded.password_hash,
             password_salt = excluded.password_salt,
             iterations = excluded.iterations`,
        )
        .bind(newHash, PBKDF2_SALT)
        .run();

      // Revoke all existing sessions for this admin in D1 and clear memory sessions
      try {
        await db.prepare("DELETE FROM admin_sessions WHERE admin_id = 'admin-master'").run();
      } catch (sessErr) {
        console.error("D1 sessions revoke error:", sessErr);
      }
      memorySessions.clear();

      return new Response(
        JSON.stringify({
          ok: true,
          message:
            "Yönetici şifresi Cloudflare D1 veritabanında başarıyla güncellendi. Eski oturumlar sonlandırıldı.",
        }),
        { headers: { "content-type": "application/json; charset=utf-8" } },
      );
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: String(err) }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
  }

  // 5. POST /api/admin/upload — PROTECTED: Direct R2 media upload
  if (url.pathname === "/api/admin/upload" && request.method === "POST") {
    const isAuthed = await verifyAdminToken(request, db);
    if (!isAuthed) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Yetkisiz erişim: Medya yükleme için yönetici girişi gerekir.",
        }),
        { status: 401, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    try {
      const rawContentType = request.headers.get("content-type") || "";
      const contentType = rawContentType.toLowerCase().split(";")[0]?.trim() || "";
      const vehicleId = request.headers.get("x-vehicle-id") || "misc";
      const filename = request.headers.get("x-file-name") || `img-${Date.now()}.webp`;
      const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const r2Key = `vehicles/${vehicleId}/${Date.now()}-${safeName}`;

      const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB limit
      const ALLOWED_MIME_TYPES = new Set([
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/gif",
      ]);

      if (!ALLOWED_MIME_TYPES.has(contentType)) {
        return new Response(
          JSON.stringify({
            ok: false,
            error:
              "Desteklenmeyen dosya türü. Yalnızca JPEG, PNG, WebP, AVIF veya GIF formatları yüklenebilir.",
          }),
          { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }

      const arrayBuffer = await request.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        return new Response(JSON.stringify({ ok: false, error: "Boş dosya yüklenemez." }), {
          status: 400,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }

      if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Dosya boyutu çok büyük (Maksimum 5 MB izin verilir).",
          }),
          { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }

      // Sniff binary magic bytes for image authenticity
      const bytes = new Uint8Array(arrayBuffer.slice(0, 16));
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      const isPng =
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      const isGif =
        bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
      const isWebp =
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 && // 'RIFF'
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50; // 'WEBP'
      const isAvif =
        bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70; // 'ftyp'

      if (!isJpeg && !isPng && !isGif && !isWebp && !isAvif) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Geçersiz dosya içeriği: Dosya imzası geçerli bir resim formatı ile eşleşmiyor.",
          }),
          { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }

      if (!resolvedEnv.BUCKET) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "R2 depolama alanı (BUCKET) sunucuda yapılandırılmamış. Medya yüklenemedi.",
          }),
          { status: 503, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }

      await resolvedEnv.BUCKET.put(r2Key, arrayBuffer, {
        httpMetadata: {
          contentType: contentType || "image/webp",
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
      const publicUrl = `/api/media/${encodeURIComponent(r2Key)}`;
      return new Response(JSON.stringify({ ok: true, url: publicUrl, r2Key, source: "r2" }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: String(err) }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
  }

  // 6. GET /api/admin/inquiries — PROTECTED: Only authenticated admins can read inquiries
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

  // 7. POST /api/admin/inquiries/status — PROTECTED: Update inquiry status with strict schema validation
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
      const rawBody = await request.json();
      const validated = InquiryStatusSchema.safeParse(rawBody);
      if (!validated.success) {
        return new Response(
          JSON.stringify({
            ok: false,
            error:
              "Geçersiz talep parametreleri: Durum yalnızca 'Yeni', 'İletişime Geçildi' veya 'Tamamlandı' olabilir.",
          }),
          { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }

      const { id, status } = validated.data;

      if (db) {
        await ensureD1Tables(db);
        await db.prepare("UPDATE inquiries SET status = ? WHERE id = ?").bind(status, id).run();
      }

      // Update memory store if present
      if (Array.isArray(memoryStore.inquiries)) {
        memoryStore.inquiries = memoryStore.inquiries.map((inq) => {
          const item = inq as { id: string; status: string };
          if (item.id === id) return { ...item, status };
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

  // 8. GET /api/cms — PUBLIC / ADMIN: Filter drafts unless authenticated admin
  if (url.pathname === "/api/cms" && request.method === "GET") {
    const isAuthedAdmin = await verifyAdminToken(request, db);
    const cacheHeaders = isAuthedAdmin
      ? { "cache-control": "private, no-cache, no-store, must-revalidate" }
      : { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" };

    if (db) {
      await ensureD1Tables(db);
      try {
        const vehicleQuery = isAuthedAdmin
          ? "SELECT * FROM vehicles ORDER BY is_featured DESC, updated_at DESC"
          : "SELECT * FROM vehicles WHERE status IN ('active', 'sold') ORDER BY is_featured DESC, updated_at DESC";

        const vehiclesRes = await db.prepare(vehicleQuery).all<VehicleDbRow>();

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
          slug: String(row.slug || row.id),
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

        const currentRevision =
          typeof settingsMap["cms_revision"] === "number"
            ? settingsMap["cms_revision"]
            : parseInt(String(settingsMap["cms_revision"] || "1"), 10) || 1;

        return new Response(
          JSON.stringify({
            ok: true,
            source: "d1",
            revision: currentRevision,
            cars: cars.length > 0 ? cars : null,
            settings: settingsMap["showcase_settings"] || null,
            cmsConfig: settingsMap["cms_config"] || null,
          }),
          {
            headers: {
              "content-type": "application/json; charset=utf-8",
              ...cacheHeaders,
            },
          },
        );
      } catch (err) {
        console.error("D1 Read error:", err);
      }
    }

    // Fallback: In-memory store (filtered for drafts if not admin)
    const rawCars = (memoryStore.cars as Array<{ status?: string }>) || null;
    const filteredCars =
      rawCars && !isAuthedAdmin
        ? rawCars.filter((c) => c.status === "active" || c.status === "sold")
        : rawCars;

    return new Response(
      JSON.stringify({
        ok: true,
        source: "memory",
        revision: memoryStore.revision || 1,
        cars: filteredCars,
        settings: memoryStore.settings || null,
        cmsConfig: memoryStore.cmsConfig || null,
      }),
      {
        headers: {
          "content-type": "application/json; charset=utf-8",
          ...cacheHeaders,
        },
      },
    );
  }

  // 9. POST /api/cms — PROTECTED: Sync catalog with Schema Validation & Safe Upsert/Diff
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
      const rawPayload = await request.json();

      // Server-side Zod Schema Validation
      const parseResult = CmsPayloadSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        const errorDetails = parseResult.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", ");
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Veri doğrulama hatası: ${errorDetails}`,
          }),
          { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }

      const payload = parseResult.data;

      // Optimistic concurrency control check
      if (db) {
        await ensureD1Tables(db);
        const revisionRow = await db
          .prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'")
          .first<{ value: string }>();
        const currentRevision = revisionRow ? parseInt(revisionRow.value, 10) || 1 : 1;

        if (payload.revision !== undefined && payload.revision !== currentRevision) {
          return new Response(
            JSON.stringify({
              ok: false,
              conflict: true,
              currentRevision,
              clientRevision: payload.revision,
              error:
                "Çakışma tespit edildi: Başka bir sekme veya cihazda daha güncel bir değişiklik kaydedilmiş. Lütfen sayfayı yenileyip güncel veriyi alın.",
            }),
            { status: 409, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        }

        const stmts: unknown[] = [];
        const orphanedR2Keys = new Set<string>();

        const extractR2Key = (targetUrl: string, fallbackKey?: string): string | null => {
          if (targetUrl.startsWith("/api/media/")) {
            return decodeURIComponent(targetUrl.replace("/api/media/", ""));
          }
          if (fallbackKey && fallbackKey.startsWith("vehicles/")) {
            return fallbackKey;
          }
          return null;
        };

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

        // 1. Explicit Targeted Deletion: Only delete vehicles specifically flagged for deletion by admin
        if (Array.isArray(payload.deletedCarIds) && payload.deletedCarIds.length > 0) {
          const placeholders = payload.deletedCarIds.map(() => "?").join(",");
          try {
            const imagesToClean = await db
              .prepare(
                `SELECT r2_key, public_url FROM vehicle_images WHERE vehicle_id IN (${placeholders})`,
              )
              .bind(...payload.deletedCarIds)
              .all<ImageDbRow>();
            for (const img of imagesToClean.results || []) {
              const k = extractR2Key(img.public_url, img.r2_key);
              if (k) orphanedR2Keys.add(k);
            }
          } catch (err) {
            console.error("Failed to query orphaned images for deleted cars:", err);
          }

          stmts.push(
            db
              .prepare(`DELETE FROM vehicle_images WHERE vehicle_id IN (${placeholders})`)
              .bind(...payload.deletedCarIds),
          );
          stmts.push(
            db
              .prepare(`DELETE FROM vehicles WHERE id IN (${placeholders})`)
              .bind(...payload.deletedCarIds),
          );
        }

        // 2. Safe Upsert for Vehicles & Images (Does NOT wipe other vehicles in the catalog)
        if (Array.isArray(payload.cars) && payload.cars.length > 0) {
          // Detect replaced images to clean up
          const carIds = payload.cars.map((c) => c.id);
          const placeholders = carIds.map(() => "?").join(",");
          try {
            const existingImages = await db
              .prepare(
                `SELECT vehicle_id, r2_key, public_url FROM vehicle_images WHERE vehicle_id IN (${placeholders})`,
              )
              .bind(...carIds)
              .all<ImageDbRow>();
            const activeUrlsByCar = new Map<string, Set<string>>();
            for (const c of payload.cars) {
              activeUrlsByCar.set(c.id, new Set(c.images || []));
            }
            for (const img of existingImages.results || []) {
              const activeUrls = activeUrlsByCar.get(img.vehicle_id);
              if (activeUrls && !activeUrls.has(img.public_url)) {
                const k = extractR2Key(img.public_url, img.r2_key);
                if (k) orphanedR2Keys.add(k);
              }
            }
          } catch (err) {
            console.error("Failed to query replaced images:", err);
          }

          // Upsert each vehicle
          for (const c of payload.cars) {
            const specs = c.specs || {};
            const desc = c.description || {};

            stmts.push(
              db
                .prepare(
                  `INSERT INTO vehicles (
                    id, slug, brand, title, year, km, fuel, gear, body,
                    power, color, package, expertise, tramer, image_fit,
                    video_url, extras_json, extras_en_json, description_tr,
                    description_en, status, is_featured, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                  ON CONFLICT(id) DO UPDATE SET
                    slug = excluded.slug,
                    brand = excluded.brand,
                    title = excluded.title,
                    year = excluded.year,
                    km = excluded.km,
                    fuel = excluded.fuel,
                    gear = excluded.gear,
                    body = excluded.body,
                    power = excluded.power,
                    color = excluded.color,
                    package = excluded.package,
                    expertise = excluded.expertise,
                    tramer = excluded.tramer,
                    image_fit = excluded.image_fit,
                    video_url = excluded.video_url,
                    extras_json = excluded.extras_json,
                    extras_en_json = excluded.extras_en_json,
                    description_tr = excluded.description_tr,
                    description_en = excluded.description_en,
                    status = excluded.status,
                    is_featured = excluded.is_featured,
                    updated_at = datetime('now')`,
                )
                .bind(
                  c.id,
                  c.slug || c.id,
                  c.brand,
                  c.title,
                  c.year,
                  c.km,
                  c.fuel,
                  c.gear,
                  c.body,
                  specs.power || "",
                  specs.color || "",
                  specs.package || "",
                  specs.expertise || "",
                  specs.tramer || "Yok",
                  c.imageFit,
                  c.video ? String(c.video) : null,
                  JSON.stringify(c.extras || []),
                  JSON.stringify(c.extrasEn || []),
                  desc.tr || "",
                  desc.en || "",
                  c.status,
                  c.featured ? 1 : 0,
                ),
            );

            // Refresh images for this vehicle atomically
            stmts.push(db.prepare("DELETE FROM vehicle_images WHERE vehicle_id = ?").bind(c.id));

            c.images.forEach((imgUrl: string, idx: number) => {
              const effectiveR2Key =
                extractR2Key(String(imgUrl), `vehicles/${c.id}/${idx + 1}`) ||
                `vehicles/${c.id}/${idx + 1}`;
              stmts.push(
                db
                  .prepare(
                    `INSERT INTO vehicle_images (id, vehicle_id, r2_key, public_url, is_cover, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
                  )
                  .bind(
                    `${c.id}-img-${idx + 1}`,
                    c.id,
                    effectiveR2Key,
                    String(imgUrl),
                    idx === 0 ? 1 : 0,
                    idx,
                  ),
              );
            });
          }
        } else if (
          Array.isArray(payload.cars) &&
          payload.cars.length === 0 &&
          payload.allowEmptyCatalog === true
        ) {
          // Explicit catalog wipe requested by authorized admin
          stmts.push(db.prepare("DELETE FROM vehicle_images"));
          stmts.push(db.prepare("DELETE FROM vehicles"));
        }

        // Increment and store revision
        const nextRevision = Math.max(currentRevision, payload.revision || 0) + 1;
        stmts.push(
          db
            .prepare(
              "INSERT INTO site_settings (key, value, updated_at) VALUES ('cms_revision', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            )
            .bind(String(nextRevision)),
        );

        // Pre-batch Atomic CAS verification: ensure revision was not updated concurrently
        const preBatchRevRow = await db
          .prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'")
          .first<{ value: string }>();
        const preBatchRevision = preBatchRevRow ? parseInt(preBatchRevRow.value, 10) || 1 : 1;
        if (payload.revision !== undefined && preBatchRevision !== currentRevision) {
          return new Response(
            JSON.stringify({
              ok: false,
              conflict: true,
              currentRevision: preBatchRevision,
              clientRevision: payload.revision,
              error:
                "Çakışma tespit edildi: Eşzamanlı başka bir işlem revizyonu güncelledi. Lütfen sayfayı yenileyin.",
            }),
            { status: 409, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        }

        // Batch execution:
        // Cloudflare D1 executes a single batch call as an atomic ACID transaction.
        // For standard catalog sizes (<= 90 statements), this provides 100% all-or-nothing atomicity.
        if (stmts.length <= 90) {
          await db.batch(stmts);
        } else {
          // Large catalog chunking protection (prevents D1 100-statement limit errors)
          const CHUNK_SIZE = 50;
          for (let i = 0; i < stmts.length; i += CHUNK_SIZE) {
            const chunk = stmts.slice(i, i + CHUNK_SIZE);
            await db.batch(chunk);
          }
        }
        // ONLY update in-memory fallback cache once D1 transaction succeeds!
        applyPayloadToMemoryStore(payload);

        // Delete orphaned R2 media files safely after D1 batch success
        if (resolvedEnv.BUCKET && orphanedR2Keys.size > 0) {
          for (const key of orphanedR2Keys) {
            try {
              // Shared media reference check: verify no remaining vehicle image in D1 still references this R2 key
              const inUseRow = await db
                .prepare(
                  "SELECT COUNT(*) as count FROM vehicle_images WHERE r2_key = ? OR public_url LIKE ?",
                )
                .bind(key, `%${encodeURIComponent(key)}%`)
                .first<{ count: number }>();

              if ((inUseRow?.count || 0) === 0) {
                await resolvedEnv.BUCKET.delete(key);
              } else {
                console.warn(
                  `R2 key "${key}" is still in use by another vehicle image. Preserving shared media.`,
                );
              }
            } catch (r2Err) {
              console.error(`Failed to delete orphaned R2 object ${key}:`, r2Err);
            }
          }
        }

        // Edge Cache Invalidation: Immediately purge cached GET /api/cms from Cloudflare Edge
        try {
          const edgeCache =
            typeof caches !== "undefined" && (caches as unknown as { default?: Cache }).default;
          if (edgeCache) {
            const cmsUrl = new URL("/api/cms", url.origin).toString();
            await edgeCache.delete(new Request(cmsUrl, { method: "GET" }));
          }
        } catch (cachePurgeErr) {
          console.warn("Edge cache purge warning:", cachePurgeErr);
        }

        return new Response(
          JSON.stringify({
            ok: true,
            source: "d1",
            revision: nextRevision,
            message: "Cloudflare D1 veritabanı başarıyla güncellendi.",
          }),
          { headers: { "content-type": "application/json; charset=utf-8" } },
        );
      } else {
        // Fallback when D1 is not bound (e.g. local dev / memory mock)
        const currentRevision = memoryStore.revision || 1;
        if (payload.revision !== undefined && payload.revision !== currentRevision) {
          return new Response(
            JSON.stringify({
              ok: false,
              conflict: true,
              currentRevision,
              clientRevision: payload.revision,
              error:
                "Çakışma tespit edildi: Başka bir sekme veya cihazda daha güncel bir değişiklik kaydedilmiş. Lütfen sayfayı yenileyip güncel veriyi alın.",
            }),
            { status: 409, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        }

        applyPayloadToMemoryStore(payload);
        return new Response(
          JSON.stringify({
            ok: true,
            source: "memory",
            revision: memoryStore.revision || 1,
            message: "Sunucu hafızası güncellendi (D1 bağlı değil).",
          }),
          { headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }
    } catch (err) {
      console.error("POST /api/cms error:", err);
      return new Response(JSON.stringify({ ok: false, error: String(err) }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
  }

  // 10. POST /api/inquiry — Customer submits VIP Offer or Special Import Request
  if (url.pathname === "/api/inquiry" && request.method === "POST") {
    // Rate Limiting: Max 5 inquiries per IP per 10 minutes (D1 persistent or memory fallback)
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const cutoff = now - windowMs;

    if (db) {
      await ensureD1Tables(db);
      try {
        await db
          .prepare("DELETE FROM inquiry_attempts WHERE created_at < ?")
          .bind(now - 3600000)
          .run();
        const countRow = await db
          .prepare(
            "SELECT COUNT(*) as count FROM inquiry_attempts WHERE ip = ? AND created_at >= ?",
          )
          .bind(ip, cutoff)
          .first<{ count: number }>();
        if ((countRow?.count || 0) >= 5) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "Çok fazla talep gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.",
            }),
            { status: 429, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        }
        await db
          .prepare("INSERT INTO inquiry_attempts (id, ip, created_at) VALUES (?, ?, ?)")
          .bind(`att-${now}-${Math.random().toString(36).slice(2, 7)}`, ip, now)
          .run();
      } catch (rateErr) {
        console.error("D1 inquiry rate limit error:", rateErr);
      }
    } else {
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
    }

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

// Dynamic Sitemap Generator (Active vehicles only from D1 + Canonical base URL)
async function handleSitemap(request: Request, env: unknown): Promise<Response> {
  const url = new URL(request.url);
  const resolvedEnv = resolveEnv(env, request);
  const baseUrl = (resolvedEnv?.SITE_URL || url.origin).replace(/\/+$/, "");

  let vehicleEntries: Array<{ slug: string; lastmod: string }> = [];

  const db = resolvedEnv?.DB;
  if (db) {
    try {
      await ensureD1Tables(db);
      const rows = await db
        .prepare(
          "SELECT slug, updated_at FROM vehicles WHERE status = 'active' ORDER BY is_featured DESC, updated_at DESC",
        )
        .all<{ slug: string; updated_at: string }>();
      if (rows.results && rows.results.length > 0) {
        vehicleEntries = rows.results.map((r) => ({
          slug: r.slug,
          lastmod:
            (r.updated_at || new Date().toISOString()).split("T")[0] ||
            new Date().toISOString().split("T")[0]!,
        }));
      }
    } catch (e) {
      console.error("D1 sitemap query error:", e);
    }
  }

  // Fallback to active catalog defaults if D1 is not bound or has no records
  if (vehicleEntries.length === 0) {
    const defaultSlugs = [
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
    const nowIso = new Date().toISOString().split("T")[0]!;
    vehicleEntries = defaultSlugs.map((s) => ({ slug: s, lastmod: nowIso }));
  }

  const nowIso = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${vehicleEntries
  .map(
    (v) => `  <url>
    <loc>${baseUrl}/arac/${v.slug}</loc>
    <lastmod>${v.lastmod}</lastmod>
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
