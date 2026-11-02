# Configuration

Roastbook reads server configuration from environment variables. Browser-visible
variables must use Vite's `VITE_` prefix and must never contain secrets.

Application variables are validated with T3 Env and Zod. Server configuration
is validated lazily on first use so Docker images can build without runtime
secrets. Empty values are treated as unset, allowing documented defaults to
apply. Invalid or incomplete configuration fails with the affected variable
names without printing secret values.

The schemas live in `src/lib/env.server.ts` for server variables and
`src/lib/env.ts` for browser-visible variables. Application code must use those
modules instead of reading the environment directly.

## Application

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | — | Yes | PostgreSQL connection URL |
| `STORAGE_PROVIDER` | `local` | No | `local` or `s3` |
| `STORAGE_PATH` | `./uploads` | No | Filesystem upload root for local storage |
| `STORAGE_URL` | `/media` | No | Application media URL base |
| `VITE_HEAD_HTML` | — | No | Trusted head markup (build time) |
| `VITE_STORAGE_URL` | `/media` | No | Browser media URL base (build time) |

`VITE_HEAD_HTML` and `VITE_STORAGE_URL` are build-time variables: Vite inlines
`import.meta.env` values when the application is built, so they cannot be
changed at container runtime and the Helm chart does not expose them. Pass
`VITE_HEAD_HTML` to `docker compose build` through the project `.env` file or
as a `--build-arg` when building the image directly. The Helm chart pins the
server-side `STORAGE_URL` to `/media`
(`charts/templates/deployment.yaml`).

`VITE_HEAD_HTML` accepts complete tags, for example an analytics `<script>` or
site-verification `<meta>` tag. The value is inserted verbatim into every HTML
document. Treat it as trusted executable configuration: never populate it from
user input or another untrusted source. Leave it unset to inject nothing.

Demo mode is selected when the application is built rather than through runtime
configuration. See [Demo mode](demo-mode.md) for build instructions and the
database-free architecture.

## Authentication and email

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `AUTH_ENABLED` | `false` | Hosted | Private accounts and journals |
| `DEPLOYMENT_MODE` | `self-hosted` | No | `self-hosted` or `hosted` |
| `AUTH_URL` | None | Auth only | Canonical HTTPS origin |
| `AUTH_SECRET` | None | Auth only | Random secret of at least 32 characters |
| `AUTH_SIGNUP_ENABLED` | `true` | No | Allow verified email signup |
| `AUTH_ADMIN_EMAIL` | None | Hosted | Bootstrap admin email |
| `AUTH_IP_HEADER` | `x-real-ip` | No | Trusted proxy IP header |
| `EMAIL_PROVIDER` | `smtp` | No | `smtp` or `resend` |
| `EMAIL_FROM` | None | Auth only | Verified sender address |
| `SMTP_URL` | None | SMTP only | SMTP connection URL, preferably `smtps://` |
| `RESEND_API_KEY` | None | Resend only | Resend API key |

Authentication uses Better Auth 1.7.15 with its email OTP plugin and the
separate `@better-auth/passkey` package. Emails contain an eight-digit code and
a link that prefills the same code. Users explicitly confirm sign-in. Codes
expire after ten minutes and allow three attempts. Shared database limits also
restrict each address to three code emails and eight sign-in attempts per ten
minutes, in addition to IP limits. Passkeys require device
verification. There are no passwords. Sessions expire after 30 days; sensitive
account and administrator actions require a session created within ten minutes.

With authentication disabled, one persistent default identity owns the journal.
Account and administrator controls are hidden. This setting is independent of
the read-only demo build. The application refuses to disable authentication on
a database containing multiple accounts.

The first verified self-hosted account becomes administrator and claims the
existing journal. Restrict network access during this initial setup. Hosted
mode requires authentication, HTTPS, and `AUTH_ADMIN_EMAIL`; other signups
receive independent, empty journals with their own brewing defaults.

A reverse proxy must overwrite `AUTH_IP_HEADER`, remove client-supplied values,
and keep the application port private. Terminate TLS at that proxy, preserve
the canonical Host, and forward cookies. Do not cache authenticated HTML, RPC,
media, or export responses. See [deployment](deployment.md) for examples.

## S3-compatible storage

Keep buckets private. Original images, thumbnails, and account archives are
served through authorized application endpoints. Do not expose a public bucket
or configure a public media CDN for private journals.

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `S3_BUCKET` | — | S3 only | Bucket name |
| `S3_REGION` | `us-east-1` | No | AWS region |
| `S3_ENDPOINT` | AWS default | No | MinIO or compatible endpoint |
| `S3_ACCESS_KEY_ID` | — | S3 only | Access key ID |
| `S3_SECRET_ACCESS_KEY` | — | S3 only | Secret access key |

## OpenAI-compatible AI

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `AI_CREDENTIAL_ENCRYPTION_KEY` | None | AI | Credential encryption key |
| `AI_ALLOWED_PRIVATE_ORIGINS` | None | No | Self-hosted origin exceptions |
| `AI_TELEMETRY_STORE_PAYLOADS` | `false` | No | Store detailed payloads |
| `AI_TELEMETRY_RETENTION_DAYS` | `1` | No | Retention (1–30 days) |
| `AI_TELEMETRY_MAX_PAYLOAD_BYTES` | `65536` | No | Cap (1 KiB–1 MiB) |

Each user configures an endpoint, API key, API format, and model IDs in
Settings > AI. AI stays disabled until that user connects a provider. There is
no fallback to a shared server API key, including in authentication-disabled
mode. The former `OPENAI_*` environment variables are no longer used.

Generate the encryption key once with `openssl rand -base64 32` and keep it in
a secret manager alongside database backups. All replicas must use the same
key. API keys use AES-256-GCM with a unique nonce and are bound to the user and
endpoint. Keys and encrypted credentials are excluded from browser responses,
offline caches, account exports, and request logs. A database dump alone does
not disclose the keys; an administrator controlling both the application and
its encryption key can decrypt them. Losing or replacing the encryption key
requires users to reconnect their providers. Removing a connection deletes its
stored credentials; account deletion removes them as well.

Public endpoints must use HTTPS. Connections resolve and validate all returned
addresses on every request, pin the connection to an approved IP, retain TLS
hostname verification, and reject redirects. Requests time out after two
minutes and responses are limited to 8 MiB. Private, loopback, metadata, and
reserved IP ranges are blocked. A self-hosted operator can allow an exact origin
such as `http://ollama:11434` with `AI_ALLOWED_PRIVATE_ORIGINS`; this grants
users permission to send AI requests to that service. Hosted deployments reject
this setting. Keep network egress restrictions as additional protection.

Changing the endpoint requires entering the API key again to avoid forwarding a
saved key to another provider. Users should only configure providers they trust:
selected journal data and images are sent to that endpoint and billed by it.
Models use provider-defined IDs. Recommendations require structured output;
image extraction uses Chat Completions with image input. Web research requires
a Responses-compatible provider with web search. Unsupported capabilities return
an error without switching to another provider or account.

Maps use OpenFreeMap styles and tiles and require no API key.

Roastbook records AI request metadata, status, token usage, duration, and cost
in PostgreSQL. Prompts, provider response events, outputs, and detailed errors
are redacted by default. Set `AI_TELEMETRY_STORE_PAYLOADS=true` only during a
short diagnostic window. Detailed payloads are capped and automatically
scrubbed after the configured retention period; they can also be purged
immediately from the AI request log in Settings. Detailed logs can contain
private bean, roaster, gear, and brew data, so keep the database and Settings
page behind the deployment's authentication boundary.

## MCP

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `MCP_ALLOWED_HOSTS` | — | No | Extra `Host` hostnames, besides loopback |
| `MCP_ALLOWED_ORIGINS` | — | No | Extra `Origin` hostnames |
| `MCP_PORT` | `3001` | No | Docker Compose loopback port for `/api/mcp` |

The endpoint requires a user-bound bearer token in both authentication modes.
See [MCP in the deployment guide](deployment.md#mcp).

## Docker Compose authentication gate

These variables configure the Hodor container rather than the Roastbook
application process.

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `HODOR_PASSWORD` | — | Yes | Shared login password |
| `HODOR_SECRET` | — | Yes | Cookie-signing secret |
| `HODOR_PORT` | `3000` | No | Published host port |
| `HODOR_IMAGE` | Pinned digest | No | Explicit Hodor image override |
| `HODOR_TITLE` | `Roastbook Login` | No | Login-page title |
| `HODOR_SESSION_TTL` | `86400` | No | Session duration in seconds |
| `HODOR_SECURE_COOKIE` | `false` | No | Require HTTPS cookies |
| `HODOR_LOG_FORMAT` | `compact` | No | Hodor log format |

Set `HODOR_SECURE_COOKIE=true` whenever Compose is served over HTTPS. These
variables are unnecessary for `docker-compose.auth.yaml`.

## Helm values

The chart's complete defaults live in `charts/values.yaml` and are validated by
`charts/values.schema.json`. See `charts/README.md` for installation examples
and the external-secret contract.
