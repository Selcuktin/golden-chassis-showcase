-- ByCar Global (bycarglobal.com) — Cloudflare D1 (SQLite) Production Schema (v3 Final Release)
-- Katalog & Teklif Usulü (Fiyatsız) Lüks Otomotiv Platformu

PRAGMA foreign_keys = ON;

-- 1. Araçlar Tablosu (slug UNIQUE otomatik indeks üretir, üst yıl uygulama katmanında dinamik doğrulanır)
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

-- 2. Araç Görselleri Tablosu (R2 Presigned Upload & Sıralama)
CREATE TABLE IF NOT EXISTS vehicle_images (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  is_cover INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle ON vehicle_images(vehicle_id, is_cover DESC, sort_order ASC);

-- 3. Müşteri Teklif & Özel İthalat Talepleri (CRM Inbox)
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

-- 4. Yönetici Kullanıcılar Tablosu (PBKDF2-HMAC-SHA256 100.000 İterasyon — Cloudflare Edge CPU limitleri için optimize)
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  iterations INTEGER NOT NULL DEFAULT 100000 CHECK (iterations >= 100000),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Yönetici Oturumları (SHA-256 Token Hash Saklama)
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

-- 6. İki Kademeli Rate Limiting & Brute-Force Koruması (15 dk / 5 Deneme)
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  ip_or_user_key TEXT UNIQUE NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  locked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. Galeri & Vitrin/Modal Ayarları Tablosu
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. Teklif Formu Rate Limiting (IP Başına 10 Dakika / 5 İstek)
CREATE TABLE IF NOT EXISTS inquiry_attempts (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inquiry_attempts_ip_time ON inquiry_attempts(ip, created_at);

-- 9. R2 Medya Çöp Toplama (Garbage Collection) ve Silme Yeniden Deneme Kuyruğu
CREATE TABLE IF NOT EXISTS r2_cleanup_queue (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_r2_cleanup_queue_key ON r2_cleanup_queue(r2_key);

-- Seed: CMS Revizyon Başlangıç Değeri (Admin kullanıcısı Cloudflare Secret veya ilk kurulum ile yönetilir)
INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES ('cms_revision', '1', datetime('now'));


