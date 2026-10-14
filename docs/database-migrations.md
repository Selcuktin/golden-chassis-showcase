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

`0002_revoke_legacy_seed_admin.sql` deletes accounts marked with the historic seed
salt `bycar-global-vip-salt-2026` and explicitly revokes their sessions first. The
salt is a public seed marker, not a secret. Accounts with a different salt (including
passwords changed in the panel) are preserved. The existing `ADMIN_PASSWORD` secret
can provision a new admin with a random salt at the next login. Before applying
this repair, verify that the deployed Worker has `ADMIN_PASSWORD` configured as a
secret and that the owner can use it; never restore the old seed to regain access.

For a reviewed production rollout:

1. Pause CMS writes for the migration window. Export a backup with
   `npx wrangler d1 export DB --remote --config wrangler.toml --output=bycar-backup.sql`.
   Store the export securely outside Git; it contains private data and credentials.
2. Inspect the remote schema against the expected baseline before applying it:
   `npx wrangler d1 execute DB --remote --config wrangler.toml --command="SELECT name, sql FROM sqlite_master WHERE type IN ('table', 'index', 'trigger')"`.
   Investigate missing/renamed columns before proceeding. Rehearse the export's
   upgrade in an isolated staging database if production differs from the fixture.
3. Check the number of affected legacy accounts/sessions without printing hashes:
   `SELECT COUNT(*) FROM admin_users WHERE password_salt = 'bycar-global-vip-salt-2026'`.
   Rehearse the backup upgrade locally and verify unrelated row counts and custom
   credentials are preserved. Apply migrations with `npm run db:migrate:remote`, using the root config explicitly.
   Build output has its own config; do not run migrations relative to `.output/`.
4. Run `npx wrangler d1 migrations list DB --remote --config wrangler.toml` and
   verify `PRAGMA table_info(site_settings)` and `PRAGMA foreign_key_check` via
   `wrangler d1 execute`. No pending migrations or FK violations should remain;
   `key` must have `notnull = 1`.
5. Only after successful remote migration and passing CI, merge the feature PR with
   a merge commit (no squash/rebase of published history). Lovable may deploy `main`
   immediately; it does not apply these D1 migrations for you. Verify admin login,
   catalog read/write and media access, then resume CMS writes. Do not deploy this
   code against an unmigrated database. Check the legacy marker count is zero.

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

The seed-repair tests first reproduce successful old-password login after an env
login on a database with 0000/0001 already applied. They then apply 0002 through
Wrangler, verify old tokens/passwords fail, custom accounts still work, env login
creates a random-salt admin, and a subsequent panel password survives env login and
migration reapplication. R2 objects and unrelated settings are also checked.

## Live preflight note (14 October 2026)

Read-only inspection found zero legacy seed accounts and sessions, no FK violations,
and one existing admin using 100000 iterations. The live `admin_users.iterations`
column still has an older default of 600000, while its CHECK allows 100000. Current
login provisioning and password changes explicitly insert 100000, so this does not
change existing password verification or require rewriting hashes. The baseline
does not retrofit that historical default; future inserts must continue to specify
iterations. Any future default-alignment migration must preserve users, credentials
and sessions, including the parent/child FK relationship.

References: [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/),
[Wrangler API](https://developers.cloudflare.com/workers/wrangler/api/),
[Drizzle D1](https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1).
