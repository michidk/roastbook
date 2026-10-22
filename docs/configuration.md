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
| `STORAGE_URL` | `/media` | No | Server-side public media URL base |
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

## S3-compatible storage

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
| `OPENAI_API_KEY` | — | No | Enables all optional AI features |
| `OPENAI_BASE_URL` | OpenAI | No | Compatible API base URL |
| `OPENAI_VISION_MODEL` | `gpt-5.1-codex` | No | Image extraction model |
| `OPENAI_RESEARCH_MODEL` | `gpt-5.1-codex` | No | Research model |
| `AI_TELEMETRY_STORE_PAYLOADS` | `false` | No | Store detailed payloads |
| `AI_TELEMETRY_RETENTION_DAYS` | `1` | No | Retention (1–30 days) |
| `AI_TELEMETRY_MAX_PAYLOAD_BYTES` | `65536` | No | Cap (1 KiB–1 MiB) |

Model values must be supported by the installed TanStack OpenAI adapter.
Unsupported configured values fall back to the application defaults.

Roastbook records AI request metadata, status, token usage, duration, and cost
in PostgreSQL. Prompts, provider response events, outputs, and detailed errors
are redacted by default. Set `AI_TELEMETRY_STORE_PAYLOADS=true` only during a
short diagnostic window. Detailed payloads are capped and automatically
scrubbed after the configured retention period; they can also be purged
immediately from the AI request log in Settings. Detailed logs can contain
private bean, roaster, gear, and brew data, so keep the database and Settings
page behind the deployment's authentication boundary.

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

Set `HODOR_SECURE_COOKIE=true` whenever Compose is served over HTTPS.

## Helm values

The chart's complete defaults live in `charts/values.yaml` and are validated by
`charts/values.schema.json`. See `charts/README.md` for installation examples
and the external-secret contract.

## Hosted waitlist

These server-only variables configure the public landing page's email signup.
They are validated separately from journal settings, so the demo needs no
PostgreSQL or storage credentials.

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | — | For signups | Resend sending API key |
| `ADMIN_EMAIL` | — | For signups | Inbox receiving each waitlist signup |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` | No | Sender email address |

The default Resend test sender can only deliver to your Resend account's email
address. To deliver elsewhere, verify a domain in Resend and set
`RESEND_FROM_EMAIL` to an address on that domain. Set these variables in Vercel
for the deployment's environment and redeploy. Never prefix them with `VITE_`.
Missing configuration or a rejected delivery shows a retry message, not a
successful signup. No subscriber database is maintained; the admin inbox is the
record of interest.
