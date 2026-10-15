-- Content-only rebrand; preserve credentials, customer history, IDs and media paths.
-- Invalidate open editors before changing stored content.
UPDATE site_settings SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT), updated_at = datetime('now')
WHERE key = 'cms_revision' AND (
  EXISTS (SELECT 1 FROM site_settings WHERE key = 'cms_config' AND (
    instr(value, 'ByCar Global') > 0 OR instr(value, 'BYCAR GLOBAL') > 0 OR
    instr(value, 'bycarglobal') > 0 OR instr(value, 'ByCar — Exclusive Automotive') > 0 OR
    instr(value, 'BYCAR EXCLUSIVE SHOWROOM') > 0))
  OR EXISTS (SELECT 1 FROM vehicles WHERE
    instr(description_tr || description_en, 'ByCar Global') > 0 OR
    instr(description_tr || description_en, 'bycarglobal') > 0 OR
    instr(description_tr || description_en, 'BYCAR GLOBAL') > 0)
);
--> statement-breakpoint
UPDATE site_settings
SET value = json_patch(replace(replace(replace(replace(replace(replace(replace(value,
  'ByCar — Exclusive Automotive | Lüks & Süper Spor Araç Koleksiyonu',
  'ByCar Etiler | Lüks Otomobil ve Özel Araç Tedariki'),
  'ByCar — Exclusive Automotive | Luxury & Supercar Collection',
  'ByCar Etiler | Luxury Cars and Bespoke Vehicle Sourcing'),
  'ByCar Global', 'ByCar Etiler'), 'BYCAR GLOBAL', 'BYCAR ETİLER'),
  'bycarglobal', 'bycaretiler'),
  'ByCar — Exclusive Automotive', 'ByCar Etiler — Exclusive Automotive'),
  'BYCAR EXCLUSIVE SHOWROOM', 'BYCAR ETILER SHOWROOM'),
  json_object('contact', json_object(
    'email', json_extract(value, '$.contact.email'),
    'instagramUrl', json_extract(value, '$.contact.instagramUrl')
  ))),
updated_at = datetime('now')
WHERE key = 'cms_config' AND json_valid(value) AND (
  instr(value, 'ByCar Global') > 0 OR instr(value, 'BYCAR GLOBAL') > 0 OR
  instr(value, 'bycarglobal') > 0 OR instr(value, 'ByCar — Exclusive Automotive') > 0 OR
  instr(value, 'BYCAR EXCLUSIVE SHOWROOM') > 0
);
--> statement-breakpoint
UPDATE vehicles SET
  description_tr = replace(replace(replace(description_tr,
    'ByCar Global', 'ByCar Etiler'), 'BYCAR GLOBAL', 'BYCAR ETİLER'), 'bycarglobal', 'bycaretiler'),
  description_en = replace(replace(replace(description_en,
    'ByCar Global', 'ByCar Etiler'), 'BYCAR GLOBAL', 'BYCAR ETİLER'), 'bycarglobal', 'bycaretiler'),
  updated_at = datetime('now')
WHERE instr(description_tr || description_en, 'ByCar Global') > 0 OR
  instr(description_tr || description_en, 'bycarglobal') > 0 OR
  instr(description_tr || description_en, 'BYCAR GLOBAL') > 0;
--> statement-breakpoint
-- Replace only the shipped generic description; custom SEO copy stays intact.
UPDATE site_settings SET value = json_set(value, '$.seo.metaDescTr',
  'ByCar Etiler lüks ve süper spor otomobil koleksiyonunu inceleyin. Araçların donanım, kilometre ve durum bilgilerini görün; güncel fiyat ve özel tedarik için bize ulaşın.'),
  updated_at = datetime('now')
WHERE key = 'cms_config' AND json_valid(value)
  AND json_extract(value, '$.seo.metaDescTr') = 'Bursa Nilüfer''de fiyatsız VIP araç koleksiyonu, özel ithalat ve süper spor otomotiv danışmanlığı.';
