# Cloudflare Workers target

`ROASTBOOK_RUNTIME=cloudflare` builds the standard edition for Cloudflare
Workers: TanStack Start on Workers, D1 as the database, R2 for media and account
exports. It leaves out Nitro, native Sharp, Nodemailer, PostgreSQL and
filesystem storage. Docker and Helm deployments use `bun run build` with
PostgreSQL instead; see [Deployment](deployment.md).

## Build and verify

```sh
bun run typecheck:cloudflare
bun run build:cloudflare         # artifact in .output/cloudflare/
bun run test:cloudflare
bun run test:cloudflare:jobs
bun run test:cloudflare:release  # after build:cloudflare
bun run dev:cloudflare           # Vite dev server, Workers adapters
```

`typecheck:cloudflare` checks the D1 schema and driver contracts.
`test:cloudflare` runs the shared journal, authentication and storage
operations in workerd against local D1 and R2. `test:cloudflare:jobs` covers
export claims, expiry, deletion and account isolation.
`test:cloudflare:release` boots the built artifact with D1, R2 and Durable
Objects and covers signed sessions, OAuth PKCE, single-use codes, concurrent
refresh rotation and disconnect races; archive tests validate ZIP output with
Python's standard ZIP reader. These run on local emulators and do
not verify live Email or Images bindings, DNS, or a deployed release.

`roastbook-release.json` in the artifact records the source revision, Worker
entry, static assets, SQL migrations, compatibility flags and a SHA-256 digest
of every file. Set `ROASTBOOK_SOURCE_REVISION` to the full commit in CI; local
builds use the checkout revision. `wrangler.runtime.jsonc` declares the bindings
for the build and a disposable local emulator only; it has no real resource IDs
and is not a deployment configuration.

## Bindings

| Binding | Purpose |
| --- | --- |
| `DB` | D1 database with the committed `drizzle-d1` migrations |
| `MEDIA` | Private R2 bucket for images and export archives |
| `ACCOUNT_EMAIL` | Service binding to a Worker that delivers account email |
| `ACCOUNT_JOBS` | SQLite Durable Object that runs account jobs on alarms |
| `IMAGES` | Cloudflare Images for validation and transforms |
| `OAUTH_COORDINATOR` | Durable Object serializing OAuth exchanges |
| `ASSETS` | Static assets from the Vite build |

`ACCOUNT_EMAIL` receives `POST /send` with a JSON message; the application
Worker holds no email provider key.

## Required variables

`AUTH_ENABLED=true`, `DEPLOYMENT_MODE=hosted`, an exact HTTPS `AUTH_URL`
origin, `AUTH_SECRET`, `AUTH_ADMIN_EMAIL` and `EMAIL_FROM`. Provided AI also
needs its AI settings and `AI_CREDENTIAL_ENCRYPTION_KEY`; empty optional secrets
disable their feature. D1, R2 and email are selected from the bindings, so no
PostgreSQL, S3, SMTP or provider credentials are used. All settings are in
[Configuration](configuration.md).

## Security boundaries

- **Requests:** origins other than `AUTH_URL` are rejected. Forwarding headers
  are replaced with Cloudflare's connecting IP before Better Auth and rate
  limiting. Responses are private and non-cacheable and carry
  `X-Roastbook-Revision` when the revision is set. Only `GET /offline-shell`
  (a prerendered, data-free page) bypasses account and origin checks.
- **Ownership:** each request gets its own bindings and journal identity through
  `AsyncLocalStorage`. D1 has no row-level security or interactive
  transactions, so journal queries require an account scope and use explicit
  owner predicates and values; composite foreign keys keep owners apart.
  Browser sync replays recorded writes through the same boundary with their
  recorded identifiers and a command receipt.
- **Atomic writes:** related writes run in one D1 batch. A CHECK constraint
  verifies expected row counts after each write, so a stale revision or an
  inactive account rolls back the whole batch. Identifier reservation is an
  atomic counter update.
- **Media:** R2 objects are served only after the ownership check; the bucket
  has no public domain and exports are never served by a public asset route.
- **Outbound requests:** the artifact requires the `global_fetch_strictly_public`
  compatibility flag, which routes fetches over the public Internet and rejects
  hosts resolving to private IPs, including the application's own zone. Do not
  add origin, VPC or private outbound bindings. Workers cannot pin DNS in Node
  HTTP, so the adapters use native fetch, validate DNS answers through
  Cloudflare DNS, reject private literals, and bound headers and response size.
  AI endpoints and client metadata must be public HTTPS; AI requests follow no
  redirects and forward only authorization, content type and accept headers.
  Remote images follow up to four validated redirects without credentials.

See Cloudflare's
[compatibility flag documentation](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#global-fetch-strictly-public)
for the outbound guarantee.

## Images

The Images binding rejects SVGs, mismatched MIME types, files over 10 MiB,
dimensions over 12,000 pixels and images over 50 million pixels. It produces
WebP full and thumbnail images (three transformations per picture) and JPEG
inputs for AI. All outputs are prepared before storage; their actual sizes count
toward the journal allowance, checked with the per-item count by a conditional
INSERT in the same batch, so concurrent uploads cannot exceed either limit. If
Images transformations are unavailable, uploads fail without storing originals
or partial sets; stored pictures stay readable from R2.

## Account jobs and exports

`ACCOUNT_JOBS` alarms claim jobs atomically and fence writes by attempt and
lease; no cron trigger is needed. Each alarm schedules the next even after a
failure, and the health check starts the loop. Deletion resumes in bounded pages
and leaves other accounts untouched. Export retries write under an
attempt-specific key, and only the current claim publishes its archive.

Exports are streaming ZIP64 with CRC32 and UTF-8 names; images are stored
without recompression. The writer honors backpressure, rejects unsafe or
duplicate paths and cancels sources when a transfer stops. R2 multipart uploads
buffer one 8 MiB part and abort on failure. Configure an R2 lifecycle rule to
remove multipart uploads abandoned by a terminated process.

An export may contain at most 5,000 rows, 200 original images and 64 MiB, and
must finish within 90 seconds; otherwise it fails without publishing a partial
ZIP.
