# D1 migration workflow

Use Node.js 24 and `npm ci`. Drizzle Kit generates SQL/snapshots from
`src/server/db/schema.ts`; Wrangler applies SQL and records completed filenames in
`d1_migrations`. Neither the API nor Drizzle's runtime client runs migrations.

## Local development

1. Edit the Drizzle schema.
2. Run `npm run db:generate -- --name=descriptive_name` and review the SQL.
3. For triggers/data repairs use `npm run db:generate -- --custom --name=descriptive_name`.
   Keep trigger bodies intact; do not split their internal semicolons into queries.
4. Run `npm run db:migrate:local`.
5. Add D1/R2 integration coverage and run `npm run test:integration` with the
   remaining CI commands. Commit SQL and Drizzle metadata together.

CI runs generation again and fails on modified or untracked migration files. Keep
applied files immutable; make corrections in a new migration. Do not use
`drizzle-kit push`, direct schema SQL, or runtime DDL for deployments.

## First rollout to an existing database

The initial migration `0000_baseline.sql` uses `IF NOT EXISTS` to adopt existing
tables without replacing catalog, inquiries, credentials, or sessions. It also
supports an empty database. This assumes the existing tables have the columns and
constraints from the previous production schema; it does not repair arbitrary
historical drift in other tables.

`0001_site_settings_integrity.sql` rebuilds only `site_settings`, preserves all
non-NULL keys and their values/timestamps, removes invalid NULL-key CAS artifacts,
sets an actual `NOT NULL` constraint, recreates the insert/update guard triggers,
and seeds `cms_revision` only if missing. An existing revision is never reset.
No R2 objects are moved or deleted by these migrations.

For a reviewed production rollout:

1. Pause CMS writes for the migration window. Export a backup with
   `npx wrangler d1 export DB --remote --config wrangler.toml --output=bycar-backup.sql`.
   Store the export securely outside Git; it contains private data and credentials.
2. Inspect the remote schema against the expected baseline before applying it:
   `npx wrangler d1 execute DB --remote --config wrangler.toml --command="SELECT name, sql FROM sqlite_master WHERE type IN ('table', 'index', 'trigger')"`.
   Investigate missing/renamed columns before proceeding. Rehearse the export's
   upgrade in an isolated staging database if production differs from the fixture.
3. Apply migrations with `npm run db:migrate:remote`, using the root config explicitly.
   Build output has its own config; do not run migrations relative to `.output/`.
4. Run `npx wrangler d1 migrations list DB --remote --config wrangler.toml` and
   verify `PRAGMA table_info(site_settings)` and `PRAGMA foreign_key_check` via
   `wrangler d1 execute`. No pending migrations or FK violations should remain;
   `key` must have `notnull = 1`.
5. Deploy the application, verify admin login, catalog read/write and media access,
   then resume CMS writes. Do not deploy this code against an unmigrated database.

Wrangler applies each migration transactionally and records only successful files.
Re-running the command skips completed migrations. For a failed deployment, the
previous application remains compatible with the tightened settings constraint.
Prefer a forward correction migration; restore the backup only as a separately
reviewed recovery operation. Never delete migration history to force a replay.

## Test boundary

`npm test` retains fast API/UI tests and the Node SQLite regression suite.
`npm run test:integration` additionally invokes the actual Wrangler migration CLI
against temporary persisted databases, then uses `getPlatformProxy` with local D1
and R2 bindings backed by workerd. It covers fresh installation, legacy data with
existing triggers, reapplication, constraints, CMS race rollback, media upload/read,
and GC retention/deletion. Remote bindings are disabled and test resource IDs are
separate from production. These are real local binding tests, not remote Cloudflare
account tests; production migrations require the rollout steps above.

References: [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/),
[Wrangler API](https://developers.cloudflare.com/workers/wrangler/api/),
[Drizzle D1](https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1).
