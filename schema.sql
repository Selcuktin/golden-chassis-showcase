-- ByCar Global (bycarglobal.com) — Cloudflare D1 (SQLite) Production Schema
-- Katalog & Teklif Usulü (Fiyatsız) Lüks Otomotiv Platformu

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  km INTEGER NOT NULL DEFAULT 0,
  fuel TEXT NOT NULL CHECK (fuel IN ('Benzin', 'Hibrit', 'Elektrik', 'Dizel')),
  gear TEXT NOT NULL CHECK (gear IN ('Otomatik', 'Manuel')),
  body TEXT NOT NULL CHECK (body IN ('Coupe', 'SUV', 'Sedan', 'Cabrio')),
  power TEXT NOT NULL,
  color TEXT NOT NULL,
  package TEXT NOT NULL,
  expertise TEXT NOT NULL,
  tramer TEXT NOT NULL DEFAULT 'Yok',
  video_url TEXT,
  extras_json TEXT NOT NULL DEFAULT '[]',
  description_tr TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'draft')),
  is_featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
