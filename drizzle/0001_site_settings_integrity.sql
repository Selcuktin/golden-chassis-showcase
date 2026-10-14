-- CREATE TABLE IF NOT EXISTS cannot retrofit NOT NULL onto legacy databases.
-- Rebuild only site_settings; it has no inbound foreign keys. Invalid NULL-key
-- rows were artifacts of the old CAS guard and were previously deleted at runtime.
CREATE TABLE site_settings_next (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
INSERT INTO site_settings_next (key, value, updated_at)
SELECT key, value, updated_at FROM site_settings WHERE key IS NOT NULL;
--> statement-breakpoint
DROP TABLE site_settings;
--> statement-breakpoint
ALTER TABLE site_settings_next RENAME TO site_settings;
--> statement-breakpoint
CREATE TRIGGER prevent_null_key_site_settings
BEFORE INSERT ON site_settings WHEN NEW.key IS NULL
BEGIN
  SELECT RAISE(ABORT, 'site_settings.key cannot be NULL');
END;
--> statement-breakpoint
CREATE TRIGGER prevent_null_key_site_settings_update
BEFORE UPDATE ON site_settings WHEN NEW.key IS NULL
BEGIN
  SELECT RAISE(ABORT, 'site_settings.key cannot be NULL');
END;
--> statement-breakpoint
INSERT OR IGNORE INTO site_settings (key, value, updated_at)
VALUES ('cms_revision', '1', datetime('now'));
