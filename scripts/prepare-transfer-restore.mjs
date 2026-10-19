// Offline only. Input must be a trusted D1 SQL export; never processes arbitrary uploaded SQL.
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error(
    "Usage: node scripts/prepare-transfer-restore.mjs trusted-export.sql .wrangler/backups/restore.sql",
  );
const outputPath = path.resolve(output);
const privateRoot = path.resolve(".wrangler") + path.sep;
if (!outputPath.startsWith(privateRoot) || path.resolve(input) === outputPath)
  throw new Error(
    "Output must be a separate file inside .wrangler/; never store private data in Git.",
  );
const tables = [
  "vehicles",
  "admin_users",
  "site_settings",
  "vehicle_images",
  "inquiries",
  "admin_sessions",
  "login_attempts",
  "inquiry_attempts",
  "r2_cleanup_queue",
];
const db = new DatabaseSync(":memory:");
const quote = (value) => {
  if (value === null) return "NULL";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value !== "string" || value.includes("\0"))
    throw new Error("Unsupported source value; manual inspection required.");
  return "'" + value.replaceAll("'", "''") + "'";
};
const identifier = (name) => '"' + name.replaceAll('"', '""') + '"';
try {
  // Execute the owner's trusted export in an isolated in-memory SQLite database.
  // D1 exports may emit child tables before parents. Disable enforcement only in this
  // offline staging database; check all foreign keys once the complete dump is loaded.
  db.exec("PRAGMA foreign_keys=OFF");
  db.exec(await readFile(input, "utf8"));
  const sourceTables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((row) => row.name);
  const unknown = sourceTables.filter(
    (name) =>
      !tables.includes(name) &&
      !name.startsWith("sqlite_") &&
      !["d1_migrations", "_cf_KV"].includes(name),
  );
  if (unknown.length || tables.some((name) => !sourceTables.includes(name)))
    throw new Error(
      "Source table inventory differs; do not silently skip unknown or missing tables.",
    );
  if (
    db.prepare("PRAGMA quick_check").get().quick_check !== "ok" ||
    db.prepare("PRAGMA foreign_key_check").all().length
  )
    throw new Error("Source integrity check failed.");
  const statements = [
    "-- Private data restore: apply only to an empty target initialized with matching versioned migrations.",
  ];
  const manifest = {};
  for (const table of tables) {
    const columns = db
      .prepare(`PRAGMA table_info(${identifier(table)})`)
      .all()
      .map((row) => row.name);
    const key = table === "site_settings" ? "key" : "id";
    const rows = db.prepare(`SELECT * FROM ${identifier(table)} ORDER BY ${identifier(key)}`).all();
    manifest[table] = {
      rows: rows.length,
      sha256: createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
    };
    for (const row of rows) {
      let sql = `INSERT INTO ${identifier(table)} (${columns.map(identifier).join(",")}) VALUES (${columns.map((column) => quote(row[column])).join(",")})`;
      if (table === "site_settings")
        sql +=
          ' ON CONFLICT("key") DO UPDATE SET "value"=excluded."value", "updated_at"=excluded."updated_at"';
      statements.push(sql + ";");
    }
  }
  await mkdir(path.dirname(outputPath), { recursive: true });
  // Exclusive creation prevents accidental overwrite of a previous private backup/restore.
  await writeFile(outputPath, statements.join("\n") + "\n", { flag: "wx", mode: 0o600 });
  await writeFile(outputPath + ".manifest.json", JSON.stringify(manifest, null, 2), {
    flag: "wx",
    mode: 0o600,
  });
  console.log(
    "Private data-only restore and comparison manifest prepared. No remote resources accessed.",
  );
} finally {
  db.close();
}
