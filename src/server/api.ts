// ByCar Etiler — Cloudflare D1 Server API & Security Engine
// Handles /api/health, /api/admin/login, /api/admin/logout, /api/admin/change-password,
// /api/admin/upload, /api/media/*, /api/admin/inquiries, /api/cms, /api/inquiry, /sitemap.xml

import { z } from "zod";
import { CmsConfigSchema, SettingsSchema, VehicleSchema } from "../lib/cms-validation";
import { isMediaReferenced, mediaKey } from "./media-references";
import { sql } from "drizzle-orm";
import { createDatabase } from "./db/client";
import { enforceCloudflareAccess, type CloudflareAccessEnv } from "./cloudflare-access";
import type { vehicles, vehicleImages, inquiries, siteSettings } from "./db/schema";
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
  head?: (key: string) => Promise<{ size: number } | null>;
  put: (
    key: string,
    value: unknown,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ) => Promise<unknown>;
  get: (
    key: string,
    options?: { range?: Headers | { offset?: number; length?: number } },
  ) => Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string; cacheControl?: string };
    size?: number;
    range?: { offset: number; length: number };
  } | null>;
  delete: (key: string) => Promise<void>;
  list?: (options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
    delimiter?: string;
  }) => Promise<{
    objects: Array<{ key: string; size: number }>;
    truncated: boolean;
    cursor?: string;
  }>;
};

export type ServerEnv = CloudflareAccessEnv & {
  DB?: D1Database;
  BUCKET?: R2Bucket;
  ADMIN_PASSWORD?: string;
  NODE_ENV?: string;
  SITE_URL?: string;
  GIT_COMMIT?: string;
};

// Strongly typed DB row interfaces
type VehicleDbRow = typeof vehicles.$inferSelect;

type ImageDbRow = typeof vehicleImages.$inferSelect;

type InquiryDbRow = typeof inquiries.$inferSelect;

type SettingDbRow = typeof siteSettings.$inferSelect;

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
export { VehicleSchema } from "../lib/cms-validation";

export const CmsPayloadSchema = z
  .object({
    cars: z.array(VehicleSchema).max(35).optional(),
    settings: SettingsSchema.optional(),
    cmsConfig: CmsConfigSchema.optional(),
    allowEmptyCatalog: z.boolean().optional(),
    deletedCarIds: z.array(z.string().min(1).max(100)).max(100).optional(),
    revision: z.number().int().nonnegative().optional(),
    force: z.boolean().optional(),
    forceExpectedRevision: z.number().int().nonnegative().optional(),
    forceReason: z.string().min(3).max(255).optional(),
  })
  .refine(
    (data) => {
      if (data.force === true) {
        return (
          typeof data.forceExpectedRevision === "number" &&
          typeof data.forceReason === "string" &&
          data.forceReason.trim().length >= 3
        );
      }
      return typeof data.revision === "number";
    },
    {
      message:
        "Eşzamanlılık koruması için geçerli bir 'revision' numarası zorunludur. Zorla yazma (force: true) durumunda üzerine yazılacak geçerli revizyon ('forceExpectedRevision') ve işlem gerekçesi ('forceReason') zorunludur.",
      path: ["revision"],
    },
  );

export const InquiryStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["Yeni", "İletişime Geçildi", "Tamamlandı"]),
});

export const ChangePasswordSchema = z.object({
  newPassword: z.string().trim().min(6, "Yönetici şifresi en az 6 karakter olmalıdır.").max(1024),
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
    memoryStore.cmsConfig = (sanitizeCmsConfig(payload.cmsConfig) as SiteCMSConfig) || null;
  }
}

const memorySessions = new Map<
  string,
  { token: string; expiresAt: number; ttl?: number; hasDb?: boolean }
>();
const ipLoginAttempts = new Map<string, { count: number; lockedUntil: number | null }>();
const ipInquiryAttempts = new Map<string, number[]>();

export function resetRateLimitsForTesting() {
  ipLoginAttempts.clear();
  ipInquiryAttempts.clear();
}

// Constant-time string equality to prevent timing attacks
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Defense-in-depth: HTML sanitization helper for user-supplied free text (B6)
export function sanitizeHtmlInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
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

// Safe JSON Body Parser: Catches SyntaxError on malformed JSON and returns 400 Bad Request
async function parseJsonBody<T = unknown>(
  request: Request,
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  try {
    const limit = new URL(request.url).pathname === "/api/cms" ? 5 * 1024 * 1024 : 64 * 1024;
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > limit) {
          await reader.cancel();
          return {
            success: false,
            response: jsonResponse(
              { ok: false, error: "İstek boyutu çok büyük." },
              { status: 413 },
            ),
          };
        }
        chunks.push(part.value);
      }
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const data = JSON.parse(new TextDecoder().decode(bytes)) as T;
    return { success: true, data };
  } catch {
    return {
      success: false,
      response: jsonResponse(
        {
          ok: false,
          error: "Geçersiz JSON formatı: İstek gövdesi çözümlenemedi.",
        },
        { status: 400 },
      ),
    };
  }
}

// Universal JSON Response Helper
export function jsonResponse(
  data: unknown,
  init?: ResponseInit & { headers?: Record<string, string> },
): Response {
  const status = init?.status ?? 200;
  const headers = new Headers(init?.headers);
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(data), { ...init, status, headers });
}

// Sanitize CMS Config to guarantee zero credential/hash leakage
export function sanitizeCmsConfig(config: unknown): Record<string, unknown> | null {
  if (!config || typeof config !== "object") return null;
  const copy = { ...(config as Record<string, unknown>) };
  delete copy["customPasswordHash"];
  delete copy["password_hash"];
  delete copy["password"];
  delete copy["secret"];
  return copy;
}

// PBKDF2 Web Crypto implementation (100,000 iterations per Cloudflare Web Crypto limit)
export const PBKDF2_SALT = "bycar-global-vip-salt-2026";
export const PBKDF2_ITERATIONS = 100000;

declare const __BYCAR_BUILD_COMMIT__: string;
export const BUILD_GIT_COMMIT =
  typeof __BYCAR_BUILD_COMMIT__ === "string" ? __BYCAR_BUILD_COMMIT__ : "development";

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

// Cryptographic salt generator
function generateRandomSaltHex(byteLength: number = 16): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Admin Token Verification Middleware
export async function verifyAdminToken(request: Request, db?: D1Database): Promise<boolean> {
  const authHeader = request.headers.get("authorization") || request.headers.get("x-admin-token");
  if (!authHeader) return false;

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  if (!token || !token.startsWith("bycar_sec_")) return false;

  const nowMs = Date.now();
  const tokenHash = await sha256Hex(token);

  const memSession = memorySessions.get(tokenHash);

  // If running in an environment WITH D1 database:
  // D1 is the authoritative source of truth for session validity & revocation
  if (db) {
    try {
      const row = await db
        .prepare(
          "SELECT id FROM admin_sessions WHERE token_hash = ? AND datetime(expires_at) > datetime('now') LIMIT 1",
        )
        .bind(tokenHash)
        .first<{ id: string }>();

      if (row?.id) {
        return true;
      }

      // If D1 returned null, check if this session was created in a pure-memory mock test (!memSession?.hasDb)
      if (memSession && !memSession.hasDb && memSession.expiresAt > nowMs) {
        return true;
      }

      // Authoritatively revoked, deleted or expired in D1: purge memory cache immediately
      memorySessions.delete(tokenHash);
      return false;
    } catch (err) {
      console.error("verifyAdminToken D1 error:", err);
      if (memSession && !memSession.hasDb && memSession.expiresAt > nowMs) {
        return true;
      }
      return false;
    }
  }

  // Pure memory fallback (when db is undefined)
  if (memSession && memSession.expiresAt > nowMs) {
    return true;
  }

  return false;
}

// Environment resolver helper
export function resolveEnv(env?: unknown, request?: Request): ServerEnv {
  if (
    env &&
    typeof env === "object" &&
    ("DB" in env ||
      "ADMIN_PASSWORD" in env ||
      "BUCKET" in env ||
      "CF_ACCESS_REQUIRED" in env ||
      "CF_ACCESS_TEAM_DOMAIN" in env ||
      "CF_ACCESS_AUD" in env ||
      "CF_ACCESS_ALLOWED_EMAILS" in env ||
      "NODE_ENV" in env)
  ) {
    return env as ServerEnv;
  }
  const globalEnv = (globalThis as unknown as { __env__?: ServerEnv })?.__env__;
  if (globalEnv && ("DB" in globalEnv || "ADMIN_PASSWORD" in globalEnv || "BUCKET" in globalEnv)) {
    return globalEnv;
  }

  const requestEnv = (request as unknown as { runtime?: { cloudflare?: { env?: ServerEnv } } })
    ?.runtime?.cloudflare?.env;
  if (requestEnv && ("DB" in requestEnv || "ADMIN_PASSWORD" in requestEnv)) {
    return requestEnv;
  }

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
    try {
      const vehiclesRes = await db
        .prepare(
          "SELECT * FROM vehicles WHERE status IN ('active', 'sold') ORDER BY is_featured DESC, sort_order ASC, updated_at DESC",
        )
        .all<VehicleDbRow>();
      const imagesRes = await db
        .prepare("SELECT * FROM vehicle_images ORDER BY vehicle_id, sort_order ASC")
        .all<ImageDbRow>();
      const settingsRes = await createDatabase(db).all<SettingDbRow>(
        sql`SELECT * FROM site_settings`,
      );

      const imagesMap = new Map<string, string[]>();
      for (const row of imagesRes.results || []) {
        const vId = String(row.vehicle_id);
        const pUrl = String(row.public_url);
        if (!imagesMap.has(vId)) imagesMap.set(vId, []);
        imagesMap.get(vId)!.push(pUrl);
      }

      const cars: Car[] = (vehiclesRes.results || []).map((row) => ({
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
      for (const s of settingsRes) {
        try {
          settingsMap[s.key] = JSON.parse(s.value);
        } catch {
          settingsMap[s.key] = s.value;
        }
      }

      {
        return {
          cars,
          settings: (settingsMap["showcase_settings"] as SiteSettings) || null,
          cmsConfig: (sanitizeCmsConfig(settingsMap["cms_config"]) as SiteCMSConfig) || null,
          source: "d1",
        };
      }
    } catch (err) {
      console.error("getLiveCmsData D1 error:", err);
      throw new Error("Katalog şu anda yüklenemiyor.");
    }
  }

  return {
    cars: ((memoryStore.cars as Car[]) || []).filter((car) => car.status !== "draft"),
    settings: (memoryStore.settings as SiteSettings) || null,
    cmsConfig: (sanitizeCmsConfig(memoryStore.cmsConfig) as SiteCMSConfig) || null,
    source: "memory",
  };
}

// SSR & Server-Side Single Vehicle Provider by slug or ID
export async function getLiveVehicleBySlug(slug: string, env?: unknown): Promise<Car | null> {
  const resolved = resolveEnv(env);
  const db = resolved.DB;
  if (db) {
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
      throw new Error("Araç şu anda yüklenemiyor.");
    }
  }
  return null;
}

// Main API Handler
export async function handleApiRequest(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  // Cloudflare serves /api routes without shared caching; response headers also protect browsers.
  const accessResponse = await enforceCloudflareAccess(request, resolveEnv(env, request));
  if (accessResponse) return accessResponse;

  if (url.pathname === "/robots.txt" && request.method === "GET") {
    const base = (resolveEnv(env, request).SITE_URL || url.origin).replace(/\/+$/, "");
    return new Response(
      `User-agent: *\nAllow: /\nAllow: /api/media/\nDisallow: /admin\nDisallow: /api/\nDisallow: /_serverFn/\n\nSitemap: ${base}/sitemap.xml\n`,
      {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-cache" },
      },
    );
  }

  // Dynamic Sitemap Route
  if (url.pathname === "/sitemap.xml" && request.method === "GET") {
    return handleSitemap(request, env);
  }

  // R2 Media Streaming Handler (supports images and video streaming with range headers)
  if (
    url.pathname.startsWith("/api/media/") &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    let key: string;
    try {
      key = decodeURIComponent(url.pathname.slice("/api/media/".length));
    } catch {
      return jsonResponse({ error: "Invalid media path" }, { status: 400 });
    }
    const resolvedEnv = resolveEnv(env, request);
    if (resolvedEnv.BUCKET && key) {
      try {
        // Range applies to GET only. Ignore unsupported/malformed range sets;
        // normalize a single byte range against metadata before reading R2.
        const match =
          request.method === "GET"
            ? /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "")
            : null;
        let range: { offset: number; length: number } | undefined;
        if (match && (match[1] || match[2])) {
          const metadata = resolvedEnv.BUCKET.head
            ? await resolvedEnv.BUCKET.head(key)
            : await resolvedEnv.BUCKET.get(key);
          if (metadata && "body" in metadata) await metadata.body.cancel();
          if (!metadata) return jsonResponse({ error: "Media not found" }, { status: 404 });
          const size = metadata.size;
          const first = Number(match[1]);
          const last = match[2] ? Number(match[2]) : (size ?? 0) - 1;
          if (size !== undefined && Number.isSafeInteger(first) && Number.isSafeInteger(last)) {
            const offset = match[1] ? first : Math.max(0, size - last);
            const end = match[1] ? Math.min(last, size - 1) : size - 1;
            if (offset >= size || end < offset || (!match[1] && last === 0)) {
              return new Response(null, {
                status: 416,
                headers: {
                  "content-range": `bytes */${size}`,
                  "cache-control": "no-store",
                  "accept-ranges": "bytes",
                },
              });
            }
            range = { offset, length: end - offset + 1 };
          }
        }
        const object = await resolvedEnv.BUCKET.get(key, range ? { range } : undefined);
        if (object) {
          const contentType = object.httpMetadata?.contentType || "image/webp";
          const headers = new Headers({
            "content-type": contentType,
            "cache-control": "public, max-age=31536000, immutable",
            "x-content-type-options": "nosniff",
            "accept-ranges": "bytes",
          });
          if (object.size !== undefined) {
            headers.set("content-length", String(object.size));
          }
          if (range) {
            headers.set("content-length", String(range.length));
            headers.set(
              "content-range",
              `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`,
            );
            return new Response(object.body, {
              status: 206,
              headers,
            });
          }
          if (request.method === "HEAD") await object.body.cancel();
          return new Response(request.method === "HEAD" ? null : object.body, {
            status: 200,
            headers,
          });
        }
      } catch (err) {
        console.error("R2 media fetch error:", err);
        return jsonResponse({ error: "Media temporarily unavailable" }, { status: 503 });
      }
    }
    return jsonResponse({ error: "Media not found" }, { status: 404 });
  }

  if (!url.pathname.startsWith("/api/")) return null;

  const resolvedEnv = resolveEnv(env, request);
  const db = resolvedEnv?.DB;
  const isD1 = Boolean(db);
  const ip = getClientIp(request);
  if (
    (resolvedEnv.NODE_ENV === "production" || resolvedEnv.CF_ACCESS_REQUIRED === "true") &&
    !db &&
    url.pathname !== "/api/health"
  ) {
    return jsonResponse(
      { ok: false, error: "Veritabanı bağlantısı yapılandırılmamış." },
      { status: 503 },
    );
  }

  // 1. GET /api/health — Includes live D1 status, version, and commit tracking
  if (url.pathname === "/api/health" && request.method === "GET") {
    try {
      if (db) await db.prepare("SELECT 1 AS ok").first();
      if (resolvedEnv.BUCKET?.list) await resolvedEnv.BUCKET.list({ limit: 1 });
    } catch {
      return jsonResponse(
        { status: "degraded", commit: resolvedEnv.GIT_COMMIT || BUILD_GIT_COMMIT },
        { status: 503 },
      );
    }
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
      const parsedBody = await parseJsonBody<{ password?: string; username?: string }>(request);
      if (!parsedBody.success) return parsedBody.response;
      const validatedLogin = z
        .object({
          password: z.string().max(1024).optional(),
          username: z.string().max(100).optional(),
        })
        .safeParse(parsedBody.data);
      if (!validatedLogin.success)
        return jsonResponse({ ok: false, error: "Geçersiz giriş bilgileri." }, { status: 400 });
      const body = validatedLogin.data;
      const rawPassword = String(body.password || "").trim();
      const rawUsername = String(body.username || "admin").trim();

      if (!rawPassword) {
        return new Response(JSON.stringify({ ok: false, error: "Şifre alanı boş bırakılamaz." }), {
          status: 400,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }

      let isMatch = false;
      let matchedViaEnv = false;
      let authenticatedAdminId = "admin-master";

      // 1. Check D1 admin_users table first
      if (db) {
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
            if (timingSafeEqual(rowCandidateHash, adminRow.password_hash)) {
              isMatch = true;
              authenticatedAdminId = adminRow.id || "admin-master";
            }
          }
        } catch (dbErr) {
          console.error("D1 admin_users lookup error:", dbErr);
        }
      }

      // 2. Check environment secret (lazy PBKDF2 computation only when needed)
      if (!isMatch && resolvedEnv?.ADMIN_PASSWORD) {
        const expectedEnvHash = await deriveServerPBKDF2Hex(resolvedEnv.ADMIN_PASSWORD.trim());
        const candidateHash = await deriveServerPBKDF2Hex(rawPassword);
        if (timingSafeEqual(candidateHash, expectedEnvHash)) {
          isMatch = true;
          matchedViaEnv = true;
        }
      }

      if (!isMatch) {
        // Record failed attempt in D1 or Memory with decay logic
        let currentCount = 1;
        if (db) {
          try {
            const attemptRow = await db
              .prepare(
                "SELECT attempt_count, locked_until FROM login_attempts WHERE ip_or_user_key = ? LIMIT 1",
              )
              .bind(ip)
              .first<{ attempt_count: number; locked_until: string | null }>();

            // Decaying window: if previously locked and lock has expired, reset base count to 0
            let previousCount = attemptRow?.attempt_count || 0;
            if (attemptRow?.locked_until && new Date(attemptRow.locked_until).getTime() <= now) {
              previousCount = 0;
            }
            currentCount = previousCount + 1;
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
          let previousCount = lockInfo?.count || 0;
          if (lockInfo?.lockedUntil && lockInfo.lockedUntil <= now) {
            previousCount = 0;
            lockInfo.lockedUntil = null;
          }
          currentCount = previousCount + 1;
          const locked = currentCount >= 5;
          const lockUntil = locked ? now + 15 * 60 * 1000 : null;
          ipLoginAttempts.set(ip, { count: currentCount, lockedUntil: lockUntil });
        }

        const remaining = Math.max(0, 5 - currentCount);
        return jsonResponse(
          {
            ok: false,
            error:
              currentCount >= 5
                ? "5 hatalı deneme yapıldı. Sistem 15 dakika kilitlendi."
                : `Geçersiz yönetici şifresi. Kalan deneme: ${remaining}`,
          },
          { status: 401 },
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
        hasDb: Boolean(db),
      });

      // Store in D1 if available
      if (db) {
        try {
          // If authenticated via environment secret, ensure admin-master row exists in admin_users
          // to satisfy FOREIGN KEY (admin_id) REFERENCES admin_users(id) on admin_sessions table
          if (matchedViaEnv) {
            const freshSalt = generateRandomSaltHex(16);
            const freshHash = await deriveServerPBKDF2HexWithParams(
              rawPassword,
              freshSalt,
              PBKDF2_ITERATIONS,
            );
            await db
              .prepare(
                `INSERT INTO admin_users (id, username, password_hash, password_salt, iterations, created_at)
                 VALUES ('admin-master', 'admin', ?, ?, 100000, datetime('now'))
                 ON CONFLICT(username) DO NOTHING`,
              )
              .bind(freshHash, freshSalt)
              .run();

            const existingAdmin = await db
              .prepare("SELECT id FROM admin_users WHERE username = ? LIMIT 1")
              .bind("admin")
              .first<{ id: string }>();
            authenticatedAdminId = existingAdmin?.id || "admin-master";
          }

          await db
            .prepare(
              "INSERT INTO admin_sessions (id, admin_id, token_hash, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(
              `sess-${crypto.randomUUID()}`,
              authenticatedAdminId,
              tokenHash,
              ip,
              request.headers.get("user-agent") || "browser",
              expiresAtIso,
            )
            .run();
        } catch (dbErr) {
          console.error("D1 session save error:", dbErr);
          // Fail-closed: Never return usable token if persistent D1 storage fails
          return jsonResponse(
            { ok: false, error: "Oturum veritabanına kaydedilemedi. Lütfen tekrar deneyiniz." },
            { status: 500 },
          );
        }
      }

      return jsonResponse({
        ok: true,
        token: sessionToken,
        expiresAt: expiresAtIso,
      });
    } catch (err) {
      console.error("POST /api/admin/login error:", err);
      return jsonResponse(
        { ok: false, error: "Giriş işlemi sırasında sunucu hatası oluştu." },
        { status: 500 },
      );
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
      if (db) {
        try {
          await db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(tokenHash).run();
        } catch (err) {
          console.error("D1 logout revoke error:", err);
          return jsonResponse(
            { ok: false, error: "Oturum sunucuda sonlandırılamadı. Lütfen tekrar deneyin." },
            { status: 503 },
          );
        }
      }
      memorySessions.delete(tokenHash);
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
      const parsedBody = await parseJsonBody(request);
      if (!parsedBody.success) return parsedBody.response;
      const body = parsedBody.data;
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
      const randomSaltBytes = new Uint8Array(16);
      crypto.getRandomValues(randomSaltBytes);
      const randomSaltHex = Array.from(randomSaltBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const newHash = await deriveServerPBKDF2HexWithParams(
        newPassword,
        randomSaltHex,
        PBKDF2_ITERATIONS,
      );

      if (!db) {
        return jsonResponse(
          {
            ok: false,
            error: "D1 veritabanı bağlı değil. Şifre kalıcı olarak güncellenemedi.",
          },
          { status: 503 },
        );
      }
      const updatePassword = db
        .prepare(
          `INSERT INTO admin_users (id, username, password_hash, password_salt, iterations, created_at)
           VALUES ('admin-master', 'admin', ?, ?, 100000, datetime('now'))
           ON CONFLICT(username) DO UPDATE SET
             password_hash = excluded.password_hash,
             password_salt = excluded.password_salt,
             iterations = excluded.iterations`,
        )
        .bind(newHash, randomSaltHex);

      // D1 batch is atomic: a revoke failure must also roll back the password.
      // Resolve by the upsert's username so historical non-master IDs are covered.
      await db.batch([
        updatePassword,
        db.prepare(
          "DELETE FROM admin_sessions WHERE admin_id IN (SELECT id FROM admin_users WHERE username = 'admin')",
        ),
      ]);
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
      console.error("POST /api/admin/change-password error:", err);
      return jsonResponse(
        { ok: false, error: "Şifre güncelleme sırasında sunucu hatası oluştu." },
        { status: 500 },
      );
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
      const rawVehicleId = request.headers.get("x-vehicle-id") || "misc";
      const vehicleId = rawVehicleId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "misc";
      const filename = request.headers.get("x-file-name") || `img-${Date.now()}.webp`;
      const safeName =
        filename
          .replace(/\.+/g, ".")
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .replace(/^[_.-]+|[_.-]+$/g, "")
          .slice(0, 100) || "image.webp";
      const r2Key = `vehicles/${vehicleId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

      const isVideo = contentType.startsWith("video/");
      const MAX_UPLOAD_BYTES = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50 MB for video, 5 MB for image
      const ALLOWED_MIME_TYPES = new Set([
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/gif",
        "video/mp4",
        "video/webm",
        "video/quicktime",
      ]);

      if (!ALLOWED_MIME_TYPES.has(contentType)) {
        return jsonResponse(
          {
            ok: false,
            error:
              "Desteklenmeyen dosya türü. Yalnızca JPEG, PNG, WebP, AVIF, GIF veya MP4/WebM video formatları yüklenebilir.",
          },
          { status: 400 },
        );
      }

      // Early reject large payloads via Content-Length before allocating ArrayBuffer
      const contentLengthHeader = request.headers.get("content-length");
      if (contentLengthHeader) {
        const declaredLength = parseInt(contentLengthHeader, 10);
        if (!Number.isNaN(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
          return jsonResponse(
            {
              ok: false,
              error: `Dosya boyutu çok büyük (Maksimum ${isVideo ? "50 MB" : "5 MB"} izin verilir).`,
            },
            { status: 413 },
          );
        }
      }

      // Enforce the limit while reading, including chunked bodies without Content-Length.
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let uploadSize = 0;
      if (reader) {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          uploadSize += part.value.byteLength;
          if (uploadSize > MAX_UPLOAD_BYTES) {
            await reader.cancel();
            return jsonResponse(
              {
                ok: false,
                error: `Dosya boyutu çok büyük (Maksimum ${isVideo ? "50 MB" : "5 MB"} izin verilir).`,
              },
              { status: 413 },
            );
          }
          chunks.push(part.value);
        }
      }
      const arrayBuffer = new Uint8Array(uploadSize);
      let uploadOffset = 0;
      for (const chunk of chunks) {
        arrayBuffer.set(chunk, uploadOffset);
        uploadOffset += chunk.byteLength;
      }
      if (arrayBuffer.byteLength === 0) {
        return jsonResponse({ ok: false, error: "Boş dosya yüklenemez." }, { status: 400 });
      }

      if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) {
        return jsonResponse(
          {
            ok: false,
            error: `Dosya boyutu çok büyük (Maksimum ${isVideo ? "50 MB" : "5 MB"} izin verilir).`,
          },
          { status: 400 },
        );
      }

      // Sniff binary magic bytes for image and video authenticity
      const bytes = arrayBuffer.subarray(0, 16);
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
        bytes[4] === 0x66 &&
        bytes[5] === 0x74 &&
        bytes[6] === 0x79 &&
        bytes[7] === 0x70 && // 'ftyp'
        bytes[8] === 0x61 &&
        bytes[9] === 0x76 &&
        bytes[10] === 0x69 && // 'avi'
        (bytes[11] === 0x66 || bytes[11] === 0x73); // 'f' or 's' (avif or avis)
      const isMp4 =
        bytes[4] === 0x66 &&
        bytes[5] === 0x74 &&
        bytes[6] === 0x79 &&
        bytes[7] === 0x70 && // 'ftyp'
        !isAvif;
      const isWebm =
        bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3; // Matroska/WebM EBML header

      let detectedMime = "";
      if (isJpeg) detectedMime = "image/jpeg";
      else if (isPng) detectedMime = "image/png";
      else if (isGif) detectedMime = "image/gif";
      else if (isWebp) detectedMime = "image/webp";
      else if (isAvif) detectedMime = "image/avif";
      else if (isMp4)
        detectedMime = contentType === "video/quicktime" ? "video/quicktime" : "video/mp4";
      else if (isWebm) detectedMime = "video/webm";

      if (!detectedMime) {
        return jsonResponse(
          {
            ok: false,
            error:
              "Geçersiz dosya içeriği: Dosya imzası geçerli bir medya formatı (resim veya video) ile eşleşmiyor.",
          },
          { status: 400 },
        );
      }

      // Match declared MIME type with detected binary format
      const normalizedContentType = contentType === "image/jpg" ? "image/jpeg" : contentType;
      if (normalizedContentType !== detectedMime) {
        return jsonResponse(
          {
            ok: false,
            error: "Dosya MIME türü tespit edilen ikili medya formatı ile eşleşmiyor.",
          },
          { status: 400 },
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
          contentType: contentType || (isVideo ? "video/mp4" : "image/webp"),
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
      const publicUrl = `/api/media/${encodeURIComponent(r2Key)}`;
      return new Response(JSON.stringify({ ok: true, url: publicUrl, r2Key, source: "r2" }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    } catch (err) {
      console.error("POST /api/admin/upload error:", err);
      return jsonResponse(
        { ok: false, error: "Dosya yükleme sırasında sunucu hatası oluştu." },
        { status: 500 },
      );
    }
  }

  // 5b. POST /api/admin/media/gc — PROTECTED: Garbage collect orphaned R2 media files (Queue Retry + Bucket Historical Sweep)
  if (url.pathname === "/api/admin/media/gc" && request.method === "POST") {
    const isAuthed = await verifyAdminToken(request, db);
    if (!isAuthed) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Yetkisiz erişim: Medya temizliği için yönetici girişi gerekir.",
        }),
        { status: 401, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    if (!db) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "D1 veritabanı bağlı değil.",
        }),
        { status: 503, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    try {
      // Parse optional GC parameters from request body
      let mode = "full"; // "queue" | "scan" | "full"
      let scanLimit = 50;
      let scanCursor: string | undefined = undefined;
      let autoDrain = true;
      let maxPagesCap: number | undefined = undefined;

      const bodyText = await request
        .clone()
        .text()
        .catch(() => "");
      if (bodyText && bodyText.trim().length > 0) {
        const parsedBody = await parseJsonBody<{
          mode?: string;
          limit?: number;
          cursor?: string;
          autoDrain?: boolean;
          maxPages?: number;
        }>(request);

        if (!parsedBody.success) {
          return parsedBody.response;
        }

        const bodyJson = parsedBody.data;
        if (bodyJson && typeof bodyJson === "object") {
          if (bodyJson.mode) mode = bodyJson.mode;
          if (typeof bodyJson.limit === "number") {
            scanLimit = Math.min(100, Math.max(1, bodyJson.limit));
          }
          if (bodyJson.cursor) scanCursor = bodyJson.cursor;
          if (typeof bodyJson.autoDrain === "boolean") autoDrain = bodyJson.autoDrain;
          if (typeof bodyJson.maxPages === "number") {
            maxPagesCap = Math.min(20, Math.max(1, bodyJson.maxPages));
          }
        }
      }

      let queueProcessed = 0;
      let queueDeleted = 0;
      let queueSkippedInUse = 0;
      let queueFailed = 0;

      // 1. Process Retry Queue (when mode is "queue" or "full")
      if (mode !== "scan") {
        const queueRows = await db
          .prepare(
            "SELECT id, r2_key, attempts, created_at FROM r2_cleanup_queue ORDER BY created_at ASC LIMIT 50",
          )
          .all<{ id: string; r2_key: string; attempts: number; created_at: number }>();

        const items = queueRows.results || [];
        queueProcessed = items.length;

        for (const item of items) {
          // Shared media reference check: verify no vehicle image still references this key
          const inUseRow = await db
            .prepare(
              "SELECT COUNT(*) as count FROM vehicle_images WHERE r2_key = ? OR public_url LIKE ?",
            )
            .bind(item.r2_key, `%${encodeURIComponent(item.r2_key)}%`)
            .first<{ count: number }>();

          if ((inUseRow?.count || 0) > 0 || (await isMediaReferenced(db, item.r2_key))) {
            // Key is currently in use, remove from cleanup queue
            await db.prepare("DELETE FROM r2_cleanup_queue WHERE id = ?").bind(item.id).run();
            queueSkippedInUse++;
            continue;
          }

          if (Number(item.created_at) > Date.now() - 24 * 60 * 60 * 1000) continue;

          if (resolvedEnv.BUCKET) {
            try {
              await resolvedEnv.BUCKET.delete(item.r2_key);
              await db.prepare("DELETE FROM r2_cleanup_queue WHERE id = ?").bind(item.id).run();
              queueDeleted++;
            } catch (delErr) {
              queueFailed++;
              await db
                .prepare(
                  "UPDATE r2_cleanup_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?",
                )
                .bind(String(delErr), item.id)
                .run();
            }
          } else {
            queueFailed++;
          }
        }
      }

      // 2. Historical Orphan Bucket Sweep (when mode is "scan" or "full")
      let scannedBucketCount = 0;
      let historicalDeletedCount = 0;
      let historicalRetainedCount = 0;
      let nextCursor: string | undefined = undefined;
      let isTruncated = false;
      let pagesProcessed = 0;
      let scanFailed = false;

      if (mode !== "queue" && resolvedEnv.BUCKET && typeof resolvedEnv.BUCKET.list === "function") {
        try {
          // Optimization: Pre-fetch all active image keys in D1 in a single query (eliminates N+1 queries)
          let activeR2KeySet: Set<string> | null = null;
          try {
            const activeImagesRes = await db
              .prepare("SELECT r2_key, public_url FROM vehicle_images")
              .all<{ r2_key: string; public_url: string }>();
            if (Array.isArray(activeImagesRes.results) && activeImagesRes.results.length > 0) {
              activeR2KeySet = new Set<string>();
              for (const row of activeImagesRes.results) {
                if (row.r2_key) activeR2KeySet.add(row.r2_key);
                if (row.public_url && row.public_url.startsWith("/api/media/")) {
                  const k = decodeURIComponent(row.public_url.replace("/api/media/", ""));
                  activeR2KeySet.add(k);
                }
              }
            }
          } catch {
            // Fallback to per-object lookup
          }

          const maxPages = autoDrain === false ? 1 : maxPagesCap || 10;
          let currentCursor = scanCursor;
          const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24-hour grace period for freshly uploaded media
          const nowMs = Date.now();

          while (pagesProcessed < maxPages) {
            const listOptions: { prefix: string; limit: number; cursor?: string } = {
              prefix: "vehicles/",
              limit: scanLimit,
            };
            if (currentCursor) {
              listOptions.cursor = currentCursor;
            }
            const listResult = await resolvedEnv.BUCKET.list(listOptions);
            const objects = listResult.objects || [];
            scannedBucketCount += objects.length;
            pagesProcessed++;
            isTruncated = Boolean(listResult.truncated);
            currentCursor = listResult.cursor;
            nextCursor = listResult.cursor;

            for (const obj of objects) {
              // 1. Grace Period Protection:
              // Protect newly uploaded media (younger than 24h) from premature cleanup
              // while the admin is still filling the vehicle form in the browser.
              let objectAgeMs = Infinity;
              const uploadedVal = (obj as unknown as { uploaded?: Date | string }).uploaded;
              if (uploadedVal) {
                objectAgeMs = nowMs - new Date(uploadedVal).getTime();
              } else {
                const tsMatch = obj.key.match(/\/(\d{13})-/);
                if (tsMatch && tsMatch[1]) {
                  objectAgeMs = nowMs - parseInt(tsMatch[1], 10);
                }
              }

              if (objectAgeMs < GRACE_PERIOD_MS) {
                historicalRetainedCount++;
                continue;
              }

              // 2. Active reference check in D1
              let isReferenced = false;
              if (activeR2KeySet) {
                isReferenced = activeR2KeySet.has(obj.key);
              } else {
                const inUseRow = await db
                  .prepare(
                    "SELECT COUNT(*) as count FROM vehicle_images WHERE r2_key = ? OR public_url LIKE ?",
                  )
                  .bind(obj.key, `%${encodeURIComponent(obj.key)}%`)
                  .first<{ count: number }>();
                isReferenced = (inUseRow?.count || 0) > 0;
              }

              if (!isReferenced) isReferenced = await isMediaReferenced(db, obj.key);
              if (!isReferenced) {
                const recentlyRetired = await db
                  .prepare(
                    "SELECT id FROM r2_cleanup_queue WHERE r2_key = ? AND created_at > ? LIMIT 1",
                  )
                  .bind(obj.key, nowMs - GRACE_PERIOD_MS)
                  .first();
                isReferenced = Boolean(recentlyRetired);
              }
              if (!isReferenced) {
                // Historical orphan older than 24h!
                try {
                  await resolvedEnv.BUCKET.delete(obj.key);
                  historicalDeletedCount++;
                } catch (delErr) {
                  // If deletion fails during historical sweep, enqueue into r2_cleanup_queue for retry
                  try {
                    await db
                      .prepare(
                        "INSERT INTO r2_cleanup_queue (id, r2_key, attempts, last_error, created_at) VALUES (?, ?, 1, ?, ?)",
                      )
                      .bind(
                        `hist-orphan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        obj.key,
                        String(delErr),
                        Date.now(),
                      )
                      .run();
                  } catch (enqueueErr) {
                    console.error("Failed to enqueue failed historical orphan key:", enqueueErr);
                  }
                }
              } else {
                historicalRetainedCount++;
              }
            }

            if (!isTruncated || !currentCursor) {
              break;
            }
          }
        } catch (scanErr) {
          scanFailed = true;
          console.error("Historical R2 bucket scan error:", scanErr);
        }
      }

      const remainingRow = await db
        .prepare("SELECT COUNT(*) as count FROM r2_cleanup_queue")
        .first<{ count: number }>();

      return new Response(
        JSON.stringify({
          ok: !scanFailed && queueFailed === 0,
          mode,
          processed: queueProcessed + scannedBucketCount,
          deleted: queueDeleted + historicalDeletedCount,
          skippedInUse: queueSkippedInUse + historicalRetainedCount,
          failed: queueFailed,
          remainingQueue: remainingRow?.count || 0,
          queue: {
            processed: queueProcessed,
            deleted: queueDeleted,
            skippedInUse: queueSkippedInUse,
            failed: queueFailed,
            remaining: remainingRow?.count || 0,
          },
          bucketScan: {
            scanned: scannedBucketCount,
            historicalDeleted: historicalDeletedCount,
            activeRetained: historicalRetainedCount,
            truncated: isTruncated,
            nextCursor: isTruncated ? nextCursor : undefined,
            pagesProcessed,
          },
        }),
        {
          status: scanFailed || queueFailed > 0 ? 503 : 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        },
      );
    } catch (err) {
      console.error("POST /api/admin/media/gc error:", err);
      return jsonResponse(
        { ok: false, error: "Medya temizleme işlemi sırasında sunucu hatası oluştu." },
        { status: 500 },
      );
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
        return jsonResponse(
          { ok: false, error: "Talepler okunamadı. Lütfen tekrar deneyin." },
          { status: 503 },
        );
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
      const parsedBody = await parseJsonBody(request);
      if (!parsedBody.success) return parsedBody.response;
      const rawBody = parsedBody.data;
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
        const updated = await db
          .prepare("UPDATE inquiries SET status = ? WHERE id = ? RETURNING id")
          .bind(status, id)
          .first<{ id: string }>();
        if (!updated)
          return jsonResponse({ ok: false, error: "Talep bulunamadı." }, { status: 404 });
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
      console.error("PATCH /api/admin/inquiries error:", err);
      return jsonResponse(
        { ok: false, error: "Talep durumu güncellenirken sunucu hatası oluştu." },
        { status: 500 },
      );
    }
  }

  if (url.pathname === "/api/admin/inquiries/delete" && request.method === "POST") {
    if (!(await verifyAdminToken(request, db)))
      return jsonResponse({ ok: false, error: "Yönetici oturumu gerekli." }, { status: 401 });
    const parsed = await parseJsonBody(request);
    if (!parsed.success) return parsed.response;
    const validated = z.object({ id: z.string().min(1).max(100) }).safeParse(parsed.data);
    if (!validated.success)
      return jsonResponse({ ok: false, error: "Geçersiz talep kimliği." }, { status: 400 });
    try {
      if (db) {
        const deleted = await db
          .prepare("DELETE FROM inquiries WHERE id = ? RETURNING id")
          .bind(validated.data.id)
          .first<{ id: string }>();
        if (!deleted)
          return jsonResponse({ ok: false, error: "Talep bulunamadı." }, { status: 404 });
      }
      memoryStore.inquiries = (memoryStore.inquiries || []).filter(
        (item) => (item as { id: string }).id !== validated.data.id,
      );
      return jsonResponse({ ok: true });
    } catch (error) {
      console.error("Inquiry deletion failed:", error);
      return jsonResponse(
        { ok: false, error: "Talep silinemedi. Lütfen tekrar deneyin." },
        { status: 503 },
      );
    }
  }

  // 8. GET /api/cms — PUBLIC / ADMIN: Filter drafts unless authenticated admin
  if (url.pathname === "/api/cms" && request.method === "GET") {
    const isAuthedAdmin = await verifyAdminToken(request, db);
    if (
      !isAuthedAdmin &&
      (request.headers.has("authorization") || request.headers.has("x-admin-token"))
    ) {
      return jsonResponse(
        { ok: false, error: "Yönetici oturumu sona erdi. Yeniden giriş yapın." },
        { status: 401 },
      );
    }
    const cacheHeaders = isAuthedAdmin
      ? { "cache-control": "private, no-cache, no-store, must-revalidate" }
      : { "cache-control": "no-cache" };

    if (db) {
      try {
        const vehicleQuery = isAuthedAdmin
          ? "SELECT * FROM vehicles ORDER BY is_featured DESC, sort_order ASC, updated_at DESC"
          : "SELECT * FROM vehicles WHERE status IN ('active', 'sold') ORDER BY is_featured DESC, sort_order ASC, updated_at DESC";

        const vehiclesRes = await db.prepare(vehicleQuery).all<VehicleDbRow>();

        const imagesRes = await db
          .prepare("SELECT * FROM vehicle_images ORDER BY vehicle_id, sort_order ASC")
          .all<ImageDbRow>();

        const settingsRes = await createDatabase(db).all<SettingDbRow>(
          sql`SELECT * FROM site_settings`,
        );

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
        for (const s of settingsRes) {
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
            cars,
            settings: settingsMap["showcase_settings"] || null,
            cmsConfig: sanitizeCmsConfig(settingsMap["cms_config"]),
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
        return jsonResponse(
          { ok: false, error: "Katalog okunamadı. Lütfen tekrar deneyin." },
          { status: 503 },
        );
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
        cmsConfig: sanitizeCmsConfig(memoryStore.cmsConfig),
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
      return jsonResponse(
        {
          ok: false,
          error: "Yetkisiz işlem: Kataloğu güncellemek için VIP Yönetici girişi yapmalısınız.",
        },
        { status: 401 },
      );
    }

    // 2) Content-Length Body Size Limit (Max 5 MB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
      return jsonResponse(
        {
          ok: false,
          error: "İstek boyutu çok büyük (Maksimum 5 MB).",
        },
        { status: 413 },
      );
    }

    // 3) CSRF / Origin Check
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        const originUrl = new URL(origin);
        const originHostname = originUrl.hostname.toLowerCase();
        const currentHostname = url.hostname.toLowerCase();
        const isAllowed =
          originHostname === currentHostname ||
          originHostname === "localhost" ||
          originHostname === "127.0.0.1";
        if (!isAllowed) {
          return jsonResponse(
            { ok: false, error: "CSRF doğrulaması başarısız oldu." },
            { status: 403 },
          );
        }
      } catch {
        return jsonResponse({ ok: false, error: "Geçersiz Origin başlığı." }, { status: 403 });
      }
    }

    try {
      const parsedBody = await parseJsonBody(request);
      if (!parsedBody.success) return parsedBody.response;
      const rawPayload = parsedBody.data;

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

      // Empty catalog protection (B5)
      if (
        Array.isArray(payload.cars) &&
        payload.cars.length === 0 &&
        payload.allowEmptyCatalog !== true
      ) {
        return new Response(
          JSON.stringify({
            ok: false,
            error:
              "Boş katalog koruması: Tüm araçları silmek istiyorsanız allowEmptyCatalog: true parametresi gönderilmelidir.",
          }),
          { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
        );
      }

      // Unique slug & ID validation across payload cars (B2)
      if (Array.isArray(payload.cars) && payload.cars.length > 0) {
        const seenSlugs = new Map<string, string>();
        const seenIds = new Set<string>();
        for (const car of payload.cars) {
          if (seenIds.has(car.id)) {
            return new Response(
              JSON.stringify({
                ok: false,
                error: `Benzersizlik hatası: "${car.id}" ID değeri birden fazla araçta mükerrer kullanılmış.`,
              }),
              { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
            );
          }
          seenIds.add(car.id);

          const effectiveSlug = (car.slug || car.id).trim().toLowerCase();
          if (seenSlugs.has(effectiveSlug)) {
            return new Response(
              JSON.stringify({
                ok: false,
                error: `Benzersizlik hatası: "${effectiveSlug}" URL slug değeri birden fazla araçta (${seenSlugs.get(effectiveSlug)} ve ${car.id}) kullanılmış. Lütfen her aracın slug/başlık değerini benzersiz yapın.`,
              }),
              { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
            );
          }
          seenSlugs.set(effectiveSlug, car.id);
        }
      }

      // Optimistic concurrency control check
      if (db) {
        const revisionRow = await db
          .prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'")
          .first<{ value: string }>();
        const currentRevision = revisionRow ? parseInt(revisionRow.value, 10) || 1 : 1;

        if (
          !payload.force &&
          payload.revision !== undefined &&
          payload.revision !== currentRevision
        ) {
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

        // Log audit trail for CAS bypass with force: true
        if (payload.force === true) {
          if (
            typeof payload.forceExpectedRevision === "number" &&
            payload.forceExpectedRevision !== currentRevision
          ) {
            return new Response(
              JSON.stringify({
                ok: false,
                conflict: true,
                currentRevision,
                clientExpectedRevision: payload.forceExpectedRevision,
                error: `Zorla yazma reddedildi: Üzerine yazılmak istenen revizyon (${payload.forceExpectedRevision}) sunucudaki güncel revizyon (${currentRevision}) ile eşleşmiyor. Başka bir sekme veya yönetici yeni bir değişiklik kaydetmiş olabilir.`,
              }),
              { status: 409, headers: { "content-type": "application/json; charset=utf-8" } },
            );
          }

          const forceAuditRecord = {
            forcedAt: new Date().toISOString(),
            ip,
            clientRevision: payload.revision ?? null,
            previousRevision: currentRevision,
            forceExpectedRevision: payload.forceExpectedRevision ?? null,
            forceReason: payload.forceReason ?? "Yönetici doğrudan zorla senkronizasyon",
          };
          stmts.push(
            db
              .prepare(
                "INSERT INTO site_settings (key, value, updated_at) VALUES ('last_force_sync', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
              )
              .bind(JSON.stringify(forceAuditRecord)),
          );
        }

        const extractR2Key = (targetUrl: string, fallbackKey?: string): string | null => {
          const parsed = mediaKey(targetUrl);
          if (parsed) return parsed;
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
          const sanitizedPayloadConfig = sanitizeCmsConfig(payload.cmsConfig);
          stmts.push(
            db
              .prepare(
                "INSERT INTO site_settings (key, value, updated_at) VALUES ('cms_config', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
              )
              .bind(JSON.stringify(sanitizedPayloadConfig)),
          );
        }

        // 1. Explicit Targeted Deletion: Only delete vehicles specifically flagged for deletion by admin
        // Uses parameter chunking (<= 40 IDs per statement) to strictly protect against D1 bound variable limits
        if (Array.isArray(payload.deletedCarIds) && payload.deletedCarIds.length > 0) {
          const ID_CHUNK_SIZE = 40;
          for (let i = 0; i < payload.deletedCarIds.length; i += ID_CHUNK_SIZE) {
            const chunk = payload.deletedCarIds.slice(i, i + ID_CHUNK_SIZE);
            const placeholders = chunk.map(() => "?").join(",");
            try {
              const imagesToClean = await db
                .prepare(
                  `SELECT r2_key, public_url FROM vehicle_images WHERE vehicle_id IN (${placeholders})`,
                )
                .bind(...chunk)
                .all<ImageDbRow>();
              for (const img of imagesToClean.results || []) {
                const k = extractR2Key(img.public_url, img.r2_key);
                if (k) orphanedR2Keys.add(k);
              }
            } catch (err) {
              console.error("Failed to query orphaned images for deleted cars chunk:", err);
            }

            stmts.push(
              db
                .prepare(`DELETE FROM vehicle_images WHERE vehicle_id IN (${placeholders})`)
                .bind(...chunk),
            );
            stmts.push(
              db.prepare(`DELETE FROM vehicles WHERE id IN (${placeholders})`).bind(...chunk),
            );
          }
        }

        // 2. Safe Upsert for Vehicles & Images (Does NOT wipe other vehicles in the catalog)
        if (Array.isArray(payload.cars) && payload.cars.length > 0) {
          // Detect replaced images to clean up using chunked queries (<= 40 IDs per query)
          const carIds = payload.cars.map((c) => c.id);
          const activeUrlsByCar = new Map<string, Set<string>>();
          for (const c of payload.cars) {
            activeUrlsByCar.set(c.id, new Set(c.images || []));
          }

          const ID_CHUNK_SIZE = 40;
          for (let i = 0; i < carIds.length; i += ID_CHUNK_SIZE) {
            const chunk = carIds.slice(i, i + ID_CHUNK_SIZE);
            const placeholders = chunk.map(() => "?").join(",");
            try {
              const existingImages = await db
                .prepare(
                  `SELECT vehicle_id, r2_key, public_url FROM vehicle_images WHERE vehicle_id IN (${placeholders})`,
                )
                .bind(...chunk)
                .all<ImageDbRow>();
              for (const img of existingImages.results || []) {
                const activeUrls = activeUrlsByCar.get(img.vehicle_id);
                if (activeUrls && !activeUrls.has(img.public_url)) {
                  const k = extractR2Key(img.public_url, img.r2_key);
                  if (k) orphanedR2Keys.add(k);
                }
              }
            } catch (err) {
              console.error("Failed to query replaced images chunk:", err);
            }
          }

          // Keep parameter counts below D1's 100-variable limit and reduce query overhead.
          const vehicleValues: unknown[][] = [];
          const imageValues: unknown[][] = [];
          for (const [sortOrder, c] of payload.cars.entries()) {
            const specs = c.specs || {};
            const desc = c.description || {};
            vehicleValues.push([
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
              sortOrder,
            ]);
            c.images.forEach((imageUrl, index) => {
              const key =
                extractR2Key(imageUrl, `vehicles/${c.id}/${index + 1}`) ||
                `vehicles/${c.id}/${index + 1}`;
              imageValues.push([
                `${c.id}-img-${index + 1}`,
                c.id,
                key,
                imageUrl,
                index === 0 ? 1 : 0,
                index,
              ]);
            });
          }
          for (let offset = 0; offset < vehicleValues.length; offset += 4) {
            const chunk = vehicleValues.slice(offset, offset + 4);
            stmts.push(
              db
                .prepare(
                  `INSERT INTO vehicles (
                    id, slug, brand, title, year, km, fuel, gear, body,
                    power, color, package, expertise, tramer, image_fit,
                    video_url, extras_json, extras_en_json, description_tr,
                    description_en, status, is_featured, sort_order, updated_at
                  ) VALUES ${chunk.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))").join(", ")}
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
                    sort_order = excluded.sort_order,
                    updated_at = datetime('now')`,
                )
                .bind(...chunk.flat()),
            );
          }
          stmts.push(
            db
              .prepare(
                `DELETE FROM vehicle_images WHERE vehicle_id IN (${carIds.map(() => "?").join(",")})`,
              )
              .bind(...carIds),
          );
          for (let offset = 0; offset < imageValues.length; offset += 15) {
            const chunk = imageValues.slice(offset, offset + 15);
            stmts.push(
              db
                .prepare(
                  `INSERT INTO vehicle_images (id, vehicle_id, r2_key, public_url, is_cover, sort_order) VALUES ${chunk.map(() => "(?, ?, ?, ?, ?, ?)").join(", ")}`,
                )
                .bind(...chunk.flat()),
            );
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

        const retiredKeys = [...orphanedR2Keys];
        for (let offset = 0; offset < retiredKeys.length; offset += 25) {
          const chunk = retiredKeys.slice(offset, offset + 25);
          stmts.push(
            db
              .prepare(
                `INSERT INTO r2_cleanup_queue (id, r2_key, attempts, created_at) VALUES ${chunk.map(() => "(?, ?, 0, ?)").join(", ")} ON CONFLICT(id) DO UPDATE SET created_at = excluded.created_at`,
              )
              .bind(...chunk.flatMap((key) => [`retired:${key}`, key, Date.now()])),
          );
        }

        // Pre-batch CAS statement preparation:
        const nextRevision = Math.max(currentRevision, payload.revision || 0) + 1;

        {
          const expectedRevision = payload.force
            ? payload.forceExpectedRevision!
            : payload.revision!;
          // SQL-Level In-Batch CAS:
          // Atomically checks if current revision matches payload.revision inside the D1 transaction.
          // If revision matches (or no setting row exists yet), key is 'cms_revision'.
          // If concurrent mismatch, key evaluates to NULL, triggering SQLite's NOT NULL constraint
          // on primary key site_settings.key. This causes db.batch() to abort and roll back
          // all other statements in the batch atomically!
          stmts.push(
            db
              .prepare(
                `INSERT INTO site_settings (key, value, updated_at)
                 VALUES (
                   CASE
                     WHEN (SELECT value FROM site_settings WHERE key = 'cms_revision') = ? THEN 'cms_revision'
                     WHEN NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'cms_revision') THEN 'cms_revision'
                     ELSE NULL
                   END,
                   ?,
                   datetime('now')
                 )
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
              )
              .bind(String(expectedRevision), String(nextRevision)),
          );
        }

        // Pre-batch verification: fail fast if already outdated before calling D1 batch
        const preBatchRevRow = await db
          .prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'")
          .first<{ value: string }>();
        const preBatchRevision = preBatchRevRow ? parseInt(preBatchRevRow.value, 10) || 1 : 1;
        if (
          !payload.force &&
          payload.revision !== undefined &&
          preBatchRevision !== payload.revision
        ) {
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

        if (
          payload.force === true &&
          typeof payload.forceExpectedRevision === "number" &&
          payload.forceExpectedRevision !== preBatchRevision
        ) {
          return new Response(
            JSON.stringify({
              ok: false,
              conflict: true,
              currentRevision: preBatchRevision,
              clientExpectedRevision: payload.forceExpectedRevision,
              error: `Zorla yazma reddedildi: Eşzamanlı başka bir işlem revizyonu (${preBatchRevision}) güncelledi.`,
            }),
            { status: 409, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        }

        // A single D1 batch is the transaction boundary, regardless of catalog size.
        // Splitting this list can commit vehicles without the revision guard.
        try {
          await db.batch(stmts);
        } catch (batchErr: unknown) {
          const errMsg = String(batchErr);
          let conflictRevision = currentRevision;
          try {
            const conflictRevRow = await db
              .prepare("SELECT value FROM site_settings WHERE key = 'cms_revision'")
              .first<{ value: string }>();
            if (conflictRevRow) {
              conflictRevision = parseInt(conflictRevRow.value, 10) || 1;
            }
          } catch {
            // Keep default
          }

          // Distinct error reporting for unique constraints vs CAS revision conflicts (B2)
          if (
            errMsg.includes("vehicles.slug") ||
            (errMsg.includes("UNIQUE") && errMsg.includes("slug"))
          ) {
            return new Response(
              JSON.stringify({
                ok: false,
                error:
                  "Benzersizlik hatası: Aynı URL/slug değerine sahip birden fazla araç bulunuyor. Lütfen araç başlıklarını veya slug'larını benzersiz yapın.",
              }),
              { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
            );
          }

          if (
            errMsg.includes("vehicle_images.r2_key") ||
            (errMsg.includes("UNIQUE") && errMsg.includes("r2_key"))
          ) {
            return new Response(
              JSON.stringify({
                ok: false,
                error:
                  "Benzersizlik hatası: Aynı görsel anahtarı (r2_key) mükerrer olarak eklenemez.",
              }),
              { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
            );
          }

          const isCasMismatch =
            conflictRevision !==
              (payload.force ? payload.forceExpectedRevision : payload.revision) ||
            errMsg.includes("site_settings.key") ||
            errMsg.includes("prevent_null_key_site_settings");

          if (isCasMismatch) {
            return new Response(
              JSON.stringify({
                ok: false,
                conflict: true,
                currentRevision: conflictRevision,
                clientRevision: payload.revision,
                error:
                  "Çakışma tespit edildi: Eşzamanlı başka bir işlem revizyonu güncelledi. Lütfen sayfayı yenileyin.",
              }),
              { status: 409, headers: { "content-type": "application/json; charset=utf-8" } },
            );
          }
          throw batchErr;
        }

        // ONLY update in-memory fallback cache once D1 transaction succeeds!
        applyPayloadToMemoryStore(payload);

        // Retired R2 files remain available for undo; the admin GC retries after 24h.

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
        if (
          !payload.force &&
          payload.revision !== undefined &&
          payload.revision !== currentRevision
        ) {
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

        if (payload.force === true) {
          if (
            typeof payload.forceExpectedRevision === "number" &&
            payload.forceExpectedRevision !== currentRevision
          ) {
            return new Response(
              JSON.stringify({
                ok: false,
                conflict: true,
                currentRevision,
                clientExpectedRevision: payload.forceExpectedRevision,
                error: `Zorla yazma reddedildi: Üzerine yazılmak istenen revizyon (${payload.forceExpectedRevision}) sunucudaki güncel revizyon (${currentRevision}) ile eşleşmiyor.`,
              }),
              { status: 409, headers: { "content-type": "application/json; charset=utf-8" } },
            );
          }

          const forceAuditRecord = {
            forcedAt: new Date().toISOString(),
            ip,
            clientRevision: payload.revision ?? null,
            previousRevision: currentRevision,
            forceExpectedRevision: payload.forceExpectedRevision ?? null,
            forceReason: payload.forceReason ?? "Yönetici doğrudan zorla senkronizasyon",
          };
          if (!memoryStore.settings || typeof memoryStore.settings !== "object") {
            memoryStore.settings = {};
          }
          (memoryStore.settings as Record<string, unknown>)["last_force_sync"] = forceAuditRecord;
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
      return jsonResponse(
        { ok: false, error: "Katalog kaydedilirken sunucu hatası oluştu." },
        { status: 500 },
      );
    }
  }

  // 10. POST /api/inquiry — Customer submits VIP Offer or Special Import Request
  if (url.pathname === "/api/inquiry" && request.method === "POST") {
    // Rate Limiting: Max 5 inquiries per IP per 10 minutes (D1 persistent or memory fallback)
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const cutoff = now - windowMs;

    if (db) {
      try {
        await db
          .prepare("DELETE FROM inquiry_attempts WHERE created_at < ?")
          .bind(now - 3600000)
          .run();
        const admitted = await db
          .prepare(
            "INSERT INTO inquiry_attempts (id, ip, created_at) SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM inquiry_attempts WHERE ip = ? AND created_at >= ?) < 5 RETURNING id",
          )
          .bind(`att-${crypto.randomUUID()}`, ip, now, ip, cutoff)
          .first<{ id: string }>();
        if (!admitted) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "Çok fazla talep gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.",
            }),
            { status: 429, headers: { "content-type": "application/json; charset=utf-8" } },
          );
        }
      } catch (rateErr) {
        console.error("D1 inquiry rate limit error:", rateErr);
        return jsonResponse(
          { ok: false, error: "Talep servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin." },
          { status: 503 },
        );
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
      const parsedBody = await parseJsonBody<{
        type?: string;
        car?: string;
        name?: string;
        phone?: string;
        offerOrBudget?: string;
        details?: string;
        vehicleId?: string;
      }>(request);
      if (!parsedBody.success) return parsedBody.response;
      const shape = z
        .object({
          type: z.enum(["Teklif", "İthalat"]).optional(),
          car: z.string(),
          name: z.string(),
          phone: z.string(),
          offerOrBudget: z.string().trim().min(1).max(2000),
          details: z.string().max(2000).optional(),
          vehicleId: z.string().max(100).optional(),
        })
        .safeParse(parsedBody.data);
      if (!shape.success)
        return jsonResponse(
          { ok: false, error: "Talep bilgileri geçersiz veya eksik." },
          { status: 400 },
        );
      const body = shape.data;

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

      if (
        phone.length < 7 ||
        phone.length > 25 ||
        !/^[+\d\s().-]+$/.test(phone) ||
        phone.replace(/\D/g, "").length < 7
      ) {
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

      let verifiedVehicleId: string | null = null;
      if (body.vehicleId && typeof body.vehicleId === "string") {
        const cleanVId = body.vehicleId.trim();
        if (cleanVId && db) {
          try {
            const vRow = await db
              .prepare("SELECT id FROM vehicles WHERE id = ? LIMIT 1")
              .bind(cleanVId)
              .first<{ id: string }>();
            if (vRow?.id) {
              verifiedVehicleId = vRow.id;
            }
          } catch {
            // ignore
          }
        }
      }

      const cleanName = sanitizeHtmlInput(name);
      const cleanPhone = sanitizeHtmlInput(phone);
      const cleanCarTitle = sanitizeHtmlInput(carTitle);
      const cleanOfferOrBudget = sanitizeHtmlInput(offerOrBudget);
      const cleanDetails = details ? sanitizeHtmlInput(details) : "";

      const inqId = `inq-${crypto.randomUUID()}`;
      if (db) {
        await db
          .prepare(
            `INSERT INTO inquiries (id, type, vehicle_id, car_title, customer_name, phone, offer_or_budget, details, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Yeni', datetime('now'))`,
          )
          .bind(
            inqId,
            type,
            verifiedVehicleId,
            cleanCarTitle,
            cleanName,
            cleanPhone,
            cleanOfferOrBudget,
            cleanDetails || null,
          )
          .run();
      }

      // Prepend to memoryStore
      const currentInqs = (memoryStore.inquiries as unknown[]) || [];
      memoryStore.inquiries = [
        {
          id: inqId,
          type,
          car: cleanCarTitle,
          name: cleanName,
          phone: cleanPhone,
          offerOrBudget: cleanOfferOrBudget,
          details: cleanDetails,
          status: "Yeni",
          time: "Az önce",
        },
        ...currentInqs,
      ];

      return jsonResponse({
        ok: true,
        inquiryId: inqId,
        source: isD1 ? "d1" : "memory",
      });
    } catch (err) {
      console.error("POST /api/inquiry error:", err);
      return jsonResponse(
        { ok: false, error: "Talep kaydedilirken bir hata oluştu. Lütfen tekrar deneyiniz." },
        { status: 500 },
      );
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
      const rows = await db
        .prepare(
          "SELECT slug, updated_at FROM vehicles WHERE status = 'active' ORDER BY is_featured DESC, sort_order ASC, updated_at DESC",
        )
        .all<{ slug: string; updated_at: string }>();
      if (rows.results && rows.results.length > 0) {
        vehicleEntries = rows.results.map((r) => ({
          slug: r.slug,
          lastmod:
            (r.updated_at || new Date().toISOString()).split(/[T ]/)[0] ||
            new Date().toISOString().split("T")[0]!,
        }));
      }
    } catch (e) {
      console.error("D1 sitemap query error:", e);
      return new Response("Sitemap temporarily unavailable", {
        status: 503,
        headers: { "cache-control": "no-store" },
      });
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${vehicleEntries
  .map(
    (v) => `  <url>
    <loc>${baseUrl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}/arac/${encodeURIComponent(v.slug)}</loc>
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
