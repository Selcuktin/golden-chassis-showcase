import type { D1Database } from "./api";

export function mediaKey(value: string): string | null {
  try {
    const path = value.startsWith("/") ? value : new URL(value).pathname;
    return path.startsWith("/api/media/")
      ? decodeURIComponent(path.slice("/api/media/".length))
      : null;
  } catch {
    return null;
  }
}

// Include CMS assets and videos: a file can be used outside vehicle_images.
// Read the current references before deletion; a cached sweep snapshot can be stale.
export async function isMediaReferenced(db: D1Database, key: string): Promise<boolean> {
  const image = await db
    .prepare("SELECT COUNT(*) as count FROM vehicle_images WHERE r2_key = ? OR public_url LIKE ?")
    .bind(key, `%${encodeURIComponent(key)}%`)
    .first<{ count: number }>();
  if ((image?.count || 0) > 0) return true;
  const videos = await db
    .prepare("SELECT video_url FROM vehicles WHERE video_url IS NOT NULL")
    .all<{ video_url: string }>();
  if (videos.results.some((row) => mediaKey(row.video_url) === key)) return true;
  const config = await db
    .prepare("SELECT value FROM site_settings WHERE key = 'cms_config'")
    .first<{ value: string }>();
  if (!config) return false;
  const contains = (value: unknown): boolean => {
    if (typeof value === "string") return mediaKey(value) === key;
    if (Array.isArray(value)) return value.some(contains);
    if (value && typeof value === "object") return Object.values(value).some(contains);
    return false;
  };
  // Invalid configuration must stop deletion rather than risk losing a referenced file.
  return contains(JSON.parse(config.value));
}
