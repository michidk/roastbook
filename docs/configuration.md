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
| `DATABASE_PROVIDER` | `postgres` | No | `postgres` |
| `STORAGE_PROVIDER` | `local` | No | `local` or `s3` |
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
total). Each picture is stored as WebP at most 2,048 pixels on its long edge,
with 800- and 256-pixel thumbnails (`src/lib/picture-sizes.ts`); the original
and its EXIF metadata, including GPS coordinates, are discarded. The browser
encodes these once and the server checks and stores them unchanged; the
server encodes only pictures the browser cannot read, such as HEIC outside
Safari. Self-hosted servers cannot read HEIC.

The demo edition is selected at build time and ignores server settings; see
[Demo mode](demo-mode.md). Browsers keep a copy of each journal in PGlite and
apply the same committed migrations, so migrate the database before deploying
a new client; see [Journal architecture](client-data.md).

## Authentication and email

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `AUTH_ENABLED` | `false` | Hosted | Private accounts and journals |
| `DEPLOYMENT_MODE` | `self-hosted` | No | `self-hosted` or `hosted` |
| `PUBLIC_URL` | — | Auth/proxy | Public browser origin; formerly `AUTH_URL` |
| `AUTH_SECRET` | — | Auth | Random secret, at least 32 characters |
| `AUTH_SIGNUP_ENABLED` | `false` | No | Open signup to any email |
| `AUTH_ADMIN_EMAIL` | — | Hosted | Comma-separated admin emails; set yours |
| `AUTH_ALLOWED_EMAILS` | — | No | Comma-separated signup emails |
| `AUTH_IP_HEADER` | `x-real-ip` | No | Client IP header from the proxy |
| `EMAIL_PROVIDER` | `smtp` | No | `smtp` or `resend` |
| `EMAIL_FROM` | — | Auth | Verified sender address |
| `SMTP_URL` | — | SMTP | SMTP URL, preferably `smtps://` |
| `RESEND_API_KEY` | — | Resend | Resend API key |

Sign-in uses emailed one-time codes (or the equivalent link) and passkeys;
there are no passwords. Codes expire after ten minutes. Sessions last 30 days.
Sensitive actions ask the owner to confirm it’s them first, with a passkey or an
emailed code, every time: creating API keys and MCP tokens, changing their or
an application's permissions, saving an AI provider key, exporting or deleting
the account, changing the email address or passkeys, and changing or deleting
users as an administrator. One sign-in confirms one action: the confirmation
is valid for five minutes, and email and passkey changes must follow within the
ten minutes the session counts as fresh.

New passkeys use the account email as the username shown by password managers.

With authentication disabled, one default identity owns a shared journal and
account controls are hidden. The application refuses to disable authentication
on a database with multiple accounts.

Signup is closed by default: only addresses in `AUTH_ADMIN_EMAIL` or
`AUTH_ALLOWED_EMAILS` can create an account, and admins are always allowed. Set
`AUTH_SIGNUP_ENABLED=true` to let anyone with a verified email sign up. Other
addresses receive no sign-in email. A new account is created only after the
person confirms it in a second step on the sign-in page.

Administrators come only from `AUTH_ADMIN_EMAIL`: set it to your own address
before enabling authentication. A listed user is made administrator at sign-in,
and again on their next request if the list changes later. Removing an address
does not demote anyone; change roles in Admin > Users. On a self-hosted
instance, the first listed administrator to sign in takes over the existing
shared journal; everyone else gets an empty private journal.
`DEPLOYMENT_MODE=hosted` requires authentication, HTTPS, and
`AUTH_ADMIN_EMAIL`. Proxy requirements are in [Deployment](deployment.md).

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
| `AI_CREDENTIAL_ENCRYPTION_KEY` | — | AI | Base64 32-byte key |
| `AI_ALLOWED_PRIVATE_ORIGINS` | — | No | Allowed private origins |
| `AI_TELEMETRY_STORE_PAYLOADS` | `false` | No | Store prompts and responses |

Each user connects their own OpenAI-compatible provider in Settings > AI; the
operator supplies only `AI_CREDENTIAL_ENCRYPTION_KEY`. Generate it once with
`openssl rand -base64 32`, use the same key on all replicas, and back it up
with the database. Losing it requires users to reconnect providers. Keys are
encrypted per user and endpoint and never reach browsers, exports, or logs.

User endpoints must use HTTPS; private, loopback, metadata, and reserved
addresses are blocked and redirects are refused. `AI_ALLOWED_PRIVATE_ORIGINS`
accepts a comma-separated list of exact origins (scheme, hostname, and port,
without a path) and is rejected in hosted mode. For example:

```env
AI_ALLOWED_PRIVATE_ORIGINS=http://ollama:11434,http://host.containers.internal:42000
```

In self-hosted mode, listed origins allow both HTTP and private addresses.
Recreate the application container after changing this variable. In Settings > AI,
enter the full API base URL, including the provider's API path, for example
`http://host.containers.internal:42000/v1`. The hostname must resolve and the
provider must be reachable from inside the application container; this setting
does not configure DNS, networking, or TLS trust.

Selected journal data and images go to the user's provider, which bills them.

Every request's metadata, status, duration, and token usage are logged in the
database and shown in Settings > AI. Prompts and responses are stored only
with `AI_TELEMETRY_STORE_PAYLOADS=true` (off by default); turning it off again
redacts the stored ones. They contain private journal data.

### Responses web research

Responses endpoints use the OpenAI Responses adapter so web research is sent
as the provider-hosted `web_search` tool. The provider must implement that
hosted tool; a Responses-compatible text endpoint alone is not sufficient.
Chat Completions endpoints retain the generic compatible adapter and do not
support online research. Endpoint validation and the protected HTTP transport
apply to both adapters.

## MCP

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `MCP_ALLOWED_HOSTS` | — | No | Extra `Host` names |
| `MCP_ALLOWED_ORIGINS` | — | No | Extra `Origin` names |
| `MCP_PORT` | `3001` | No | Loopback port in `docker-compose.yaml` |

Loopback and the `PUBLIC_URL` hostname are always allowed.

See [Deployment](deployment.md) for MCP authentication and exposure.

## API and MCP

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `INTEGRATION_RATE_LIMIT_PER_MINUTE` | `120` | No | Requests per minute |
| `INTEGRATION_RATE_LIMIT_PER_DAY` | `5000` | No | Requests per UTC day |

The limits apply to all API keys, MCP tokens, and MCP applications of one
account together. Compose passes both variables through; Helm sets them with
`integrations.rateLimit.perMinute` and `integrations.rateLimit.perDay`. See
[API](api.md).

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
