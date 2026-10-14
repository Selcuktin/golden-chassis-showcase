<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Change rules

- Work on a feature branch and open a pull request. Never push directly to `main`.
- Change database structure, constraints, triggers, indexes, and data repairs only
  through versioned migrations in `drizzle/`. Never execute DDL from request handlers
  or edit migrations that have already been applied. Keep `src/server/db/schema.ts`
  and the Drizzle snapshots aligned with the resulting schema.
- Every database change must include integration tests against actual local
  Cloudflare D1/R2 bindings (Wrangler/workerd), including existing-data upgrades,
  constraints, and rollback where relevant. SQL mocks alone are insufficient.
  Never run tests against production resources.
- Do not write custom authentication/session/cryptography implementations. Use a
  maintained authentication library or managed identity provider for new auth work.
  Existing authentication must be preserved until a separately scoped, tested
  replacement is approved; do not expand it during unrelated work.
- Keep changes within the requested scope. Record other architectural findings
  separately instead of silently rewriting unrelated features.
- Before proposing a merge, run typecheck, ESLint, Vitest, D1/R2 integration tests,
  production build, and npm audit. Report failures and limitations explicitly.
