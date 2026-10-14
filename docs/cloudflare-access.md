# Cloudflare Access for ByCar administration

The public showroom and inquiries remain public. Administration now uses two
layers: Cloudflare Access identity first, then the existing application session.
JWT signature/issuer/audience/lifetime verification is performed by `jose`, not
custom cryptography. The existing password/session identity model is preserved;
a separate session reliability fix makes password replacement and revocation
atomic and makes the panel reject unconfirmed/HTML mutation responses.

## Managed application

The account's self-hosted application **ByCar Admin** protects these paths on the
deployed `selcuktin-golden-chassis-showcase.selcuktin.workers.dev` hostname:

- `/admin` and its subpaths
- `/api/admin` and its subpaths

Its allow policy contains the owner's explicitly selected email. Do not use an
Everyone, Bypass, or broad email-domain policy. The session duration is 24 hours
and the Access cookie is HttpOnly. The user must complete Access sign-in in their
own browser; never copy passwords, OTPs or Access session cookies into Git or logs.

Application ID: `9746ae16-41fe-4f9c-84d0-45d8c16b6ec2`.
The team URL and audience in `wrangler.toml` are public configuration. The email
allow list is stored separately as the Worker secret `CF_ACCESS_ALLOWED_EMAILS`.
An existing Access application for another project was not modified.

## Shared CMS endpoint

`GET /api/cms` supplies the public showroom; `POST /api/cms` edits it. Applying
Access to the entire path would hide the public catalog. The server therefore
requires a valid Access JWT for every CMS write and every catalog read carrying
an application session header (draft/admin reads). It accepts the edge's
`Cf-Access-Jwt-Assertion`, or the same host's signed `CF_Authorization` cookie on
the shared CMS route. The cookie must be scoped to `/`, not just `/admin`.

The server also enforces Access on admin pages and admin API paths. A stolen app
session alone, a spoofed email header, unsigned JWT, wrong issuer/audience or an
expired JWT cannot pass this boundary. JWT errors deny access; partial or invalid
configuration returns 503 for privileged requests. Public routes stay available.

## Configuration and rollout

1. Create/review the managed app and its exact-email allow policy first. Use a
   Cloudflare token with Access Apps and Policies edit permission; a Wrangler
   Workers-only OAuth session may return `403 auth.forbidden` for this operation.
2. Configure `CF_ACCESS_ALLOWED_EMAILS` using `wrangler secret put` with the approved
   comma-separated addresses. Do not commit the addresses or the API token.
3. Set `CF_ACCESS_REQUIRED=true`, `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` in the
   Worker config; use the app's actual team URL and AUD. A missing setting must
   fail closed. No configuration is allowed only for isolated local development
   and existing unit tests; production sets the required flag explicitly.
4. Run all CI checks and deploy from the reviewed commit. Verify anonymous `/admin`
   and `/api/admin/me` redirect to Access, anonymous CMS writes are rejected,
   and public catalog/health/media/inquiry routes still work.
5. The owner signs in to Access with the approved email, logs in to the existing
   admin panel, confirms draft reads and saves a deliberate real edit. Do not
   simulate customer inquiries or catalog writes against production for testing.

Before adding custom domains, aliases or preview hostnames, add their admin paths
to the managed application and verify the same boundary there. The origin guard
still denies privileged requests without a valid Access token on unregistered
aliases, but they cannot provide a functional admin sign-in until configured.

To rotate an exposed Cloudflare API token, create its replacement with the least
required permissions, update the local environment, verify access, then revoke the
old token. API tokens are operational credentials; they are not Worker secrets.

References: [Cloudflare path protection](https://developers.cloudflare.com/workers/configuration/cloudflare-access/),
[JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/),
[authorization cookies](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/).
