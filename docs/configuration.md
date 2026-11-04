# Configuration

Roastbook reads server configuration from environment variables, validated in
`src/lib/env.server.ts`; browser-visible `VITE_` variables are validated in
`src/lib/env.ts` and must never contain secrets. Server configuration is
validated on first use, so images build without runtime secrets. Empty values
count as unset. Invalid configuration fails with the variable names, without
printing secret values.

## Application

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | — | PostgreSQL | PostgreSQL connection URL |
| `DATABASE_PROVIDER` | `postgres` | No | `postgres` or `d1` (Workers) |
| `STORAGE_PROVIDER` | `local` | No | `local`, `s3`, or `r2` (Workers) |
| `STORAGE_PATH` | `./uploads` | No | Upload root for local storage |
| `STORAGE_URL` | `/media` | No | Server media URL base |
| `IMAGE_MAX_PER_ITEM` | `3` | No | Pictures per item, 1–100 |
| `IMAGE_STORAGE_LIMIT_MIB` | `0`; hosted `250` | No | MiB per journal |
| `VITE_HEAD_HTML` | — | No | Trusted head markup (build time) |
| `VITE_STORAGE_URL` | `/media` | No | Browser media URL base (build time) |

`VITE_` variables are inlined when the application is built and cannot be
changed at runtime; the Helm chart does not expose them. Pass `VITE_HEAD_HTML`
to `docker compose build` through `.env` or as a `--build-arg`. It is inserted
verbatim into every HTML document, including the public offline shell, so treat
it as trusted executable configuration and never put private data in it.

The image storage limit (`0` is unlimited) counts each stored picture and its
thumbnails; existing pictures stay accessible when a limit is lowered. Uploads
may contain up to 10 MiB of image data and 12,000 pixels per side (50 million
total). The server
stores a WebP of at most 1,600 pixels plus two thumbnails, discards the
original, and strips EXIF metadata including GPS coordinates.

The demo edition is selected at build time and ignores server settings; see
[Demo mode](demo-mode.md). Browsers keep a copy of each journal in PGlite and
apply the same committed migrations, so migrate the database before deploying
a new client; see [Journal architecture](client-data.md).

## Authentication and email

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `AUTH_ENABLED` | `false` | Hosted | Private accounts and journals |
| `DEPLOYMENT_MODE` | `self-hosted` | No | `self-hosted` or `hosted` |
| `AUTH_URL` | — | Auth | Canonical HTTPS origin |
| `AUTH_SECRET` | — | Auth | Random secret, at least 32 characters |
| `AUTH_SIGNUP_ENABLED` | `true` | No | Allow verified email signup |
| `AUTH_ADMIN_EMAIL` | — | Hosted | Bootstrap administrator email |
| `AUTH_IP_HEADER` | `x-real-ip` | No | Client IP header from the proxy |
| `EMAIL_PROVIDER` | `smtp` | No | `smtp`, `resend`, or `service` (Workers) |
| `EMAIL_FROM` | — | Auth | Verified sender address |
| `SMTP_URL` | — | SMTP | SMTP URL, preferably `smtps://` |
| `RESEND_API_KEY` | — | Resend | Resend API key |

Sign-in uses emailed one-time codes (or the equivalent link) and passkeys;
there are no passwords. Codes expire after ten minutes. Sessions last 30 days;
sensitive account and administrator actions require a sign-in within the last
ten minutes.

With authentication disabled, one default identity owns a shared journal and
account controls are hidden. The application refuses to disable authentication
on a database with multiple accounts. With authentication enabled, the first
verified self-hosted account becomes administrator and claims the existing
journal, so keep the instance private until then. `DEPLOYMENT_MODE=hosted`
requires authentication, HTTPS, and `AUTH_ADMIN_EMAIL`; every other signup gets
an empty private journal. Proxy requirements are in [Deployment](deployment.md).

## S3-compatible storage

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `S3_BUCKET` | — | S3 | Bucket name |
| `S3_REGION` | `us-east-1` | No | Region |
| `S3_ENDPOINT` | AWS default | No | MinIO or compatible endpoint |
| `S3_ACCESS_KEY_ID` | — | S3 | Access key ID |
| `S3_SECRET_ACCESS_KEY` | — | S3 | Secret access key |

Keep buckets private. The application serves pictures and exports through
authorized endpoints; do not put a public bucket or CDN in front of them.

## OpenAI-compatible AI

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `AI_CREDENTIAL_ENCRYPTION_KEY` | — | BYOAI | Base64 32-byte key |
| `AI_PROVIDED_API_KEY` | — | Provided AI | Operator API key |
| `AI_PROVIDED_BASE_URL` | OpenAI API | No | Operator endpoint |
| `AI_PROVIDED_API` | `responses` | No | Or `chat-completions` |
| `AI_PROVIDED_VISION_MODEL` | — | Provided AI | Image model ID |
| `AI_PROVIDED_RESEARCH_MODEL` | — | Provided AI | Text model ID |
| `AI_ALLOWED_PRIVATE_ORIGINS` | — | No | Allowed private origins |
| `AI_TELEMETRY_STORE_PAYLOADS` | `false` | No | Store prompts and responses |
| `AI_TELEMETRY_RETENTION_DAYS` | `1` | No | Retention, 1–30 days |
| `AI_TELEMETRY_MAX_PAYLOAD_BYTES` | `65536` | No | Cap, 1 KiB–1 MiB |
| `OPENAI_API_KEY` | — | No | Fallback operator key |
| `OPENAI_BASE_URL` | OpenAI API | No | Fallback endpoint |
| `OPENAI_VISION_MODEL` | `gpt-5.1-codex` | No | Fallback image model |
| `OPENAI_RESEARCH_MODEL` | `gpt-5.1-codex` | No | Fallback text model |

Users either connect their own provider (BYOAI) in Settings > AI or use the
operator's provided AI. BYOAI needs `AI_CREDENTIAL_ENCRYPTION_KEY`: generate it
once with `openssl rand -base64 32`, use the same key on all replicas, and back
it up with the database. Losing it requires users to reconnect providers.

Provided AI is available only with authentication enabled and an operator key
set. Any nonempty `AI_PROVIDED_*` variable selects that set as a whole;
otherwise the `OPENAI_*` variables supply the operator provider using the
Responses API. Both endpoints default to `https://api.openai.com/v1`; the
operator endpoint may be an internal HTTP(S) service.
Each account gets 10 provided operations per week (reset Monday 00:00 UTC),
adjustable per user in Admin > Users. Reserved operations stay consumed on
failure. Set provider-side spending limits as well.

User endpoints must use HTTPS; private, loopback, metadata, and reserved
addresses are blocked and redirects are refused. `AI_ALLOWED_PRIVATE_ORIGINS`
allows exact origins such as `http://ollama:11434` and is rejected in hosted
mode.

Request metadata and token usage are logged in the database; payloads are
stored only with `AI_TELEMETRY_STORE_PAYLOADS=true`. They can contain private
journal data, so enable it only for short diagnostics.

## MCP

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `MCP_ALLOWED_HOSTS` | — | No | Extra `Host` names |
| `MCP_ALLOWED_ORIGINS` | — | No | Extra `Origin` names |
| `MCP_PORT` | `3001` | No | Loopback port in `docker-compose.yaml` |

Loopback and the `AUTH_URL` hostname are always allowed.

See [Deployment](deployment.md) for MCP authentication and exposure.

## Docker Compose

These variables are read by the Compose files, not by the application.

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `HODOR_PASSWORD` | — | Hodor | Shared login password |
| `HODOR_SECRET` | — | Hodor | Cookie-signing secret |
| `HODOR_PORT` | `3000` | No | Published Hodor port |
| `HODOR_IMAGE` | Pinned digest | No | Hodor image override |
| `HODOR_TITLE` | `Roastbook Login` | No | Login page title |
| `HODOR_SESSION_TTL` | `86400` | No | Session duration in seconds |
| `HODOR_SECURE_COOKIE` | `false` | No | Set `true` when served over HTTPS |
| `HODOR_LOG_FORMAT` | `compact` | No | Hodor log format |
| `APP_PORT` | `3000` | No | Published port in `docker-compose.auth.yaml` |

## Helm values

Chart defaults live in `charts/values.yaml`, validated by
`charts/values.schema.json`. See `charts/README.md`.

## Cloudflare Workers

The Workers build uses D1, R2, and Cloudflare Email Sending bindings instead of
`DATABASE_URL`, local or S3 storage, and SMTP, and always requires
authentication. `ROASTBOOK_SOURCE_REVISION` records the source commit. See
[Cloudflare runtime](cloudflare-runtime.md).
