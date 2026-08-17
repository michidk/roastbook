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
| `DEMO_MODE` | `false` | No | Enable database-backed read-only mode |
| `STORAGE_PROVIDER` | `local` | No | `local` or `s3` |
| `STORAGE_PATH` | `./uploads` | Local storage only | Filesystem upload root |
| `STORAGE_URL` | `/media` | No | Server-side public media URL base |
| `VITE_STORAGE_URL` | `/media` | No | Browser media URL base |

When `DEMO_MODE=true`, Roastbook rejects every non-GET/HEAD application
request on the server and shows a read-only banner in the interface. Seed the
database before enabling it; demo mode does not populate data automatically.
See [Demo mode](demo-mode.md) for deployment steps and the proposed
database-free architecture.

## S3-compatible storage

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `S3_BUCKET` | — | S3 only | Bucket name |
| `S3_REGION` | `us-east-1` | S3 only | AWS region |
| `S3_ENDPOINT` | AWS default | No | MinIO or compatible endpoint |
| `S3_ACCESS_KEY_ID` | — | S3 only | Access key ID |
| `S3_SECRET_ACCESS_KEY` | — | S3 only | Secret access key |

## OpenAI-compatible AI

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | — | No | Enables all optional AI features |
| `OPENAI_BASE_URL` | OpenAI | No | Compatible API base URL |
| `OPENAI_VISION_MODEL` | `gpt-4o` | No | Model used for image extraction |
| `OPENAI_RESEARCH_MODEL` | `gpt-4o` | No | Research/recommendation model |

Model values must be supported by the installed TanStack OpenAI adapter.
Unsupported configured values fall back to the application defaults.

Roastbook records raw AI inputs, normalized provider response events, errors,
and token usage in PostgreSQL. These logs are available from the AI card at the
bottom of Settings. Image-extraction logs include the complete base64 image
payload, so the database and Settings page must remain behind the deployment's
authentication boundary.

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
