# Upgrading to the multi-user release

This release adds private accounts, a SQL journal that also runs in the
browser, and bring-your-own AI. Read every step before starting; step 3
applies only with accounts enabled (`AUTH_ENABLED=true`).

## 1. Back up

Back up PostgreSQL and uploaded files, and check that the backup restores.
The upgrade runs many schema migrations, and they are not reverted on
rollback.

## 2. PostgreSQL 18

The Compose files and the Helm chart's bundled database now use PostgreSQL 18.
A data volume created by an older major version does not start on it. Dump and
restore it first: see
[Upgrading PostgreSQL to a new major version](deployment.md#upgrading-postgresql-to-a-new-major-version).

## 3. Accounts and administrators

- **Set `AUTH_ADMIN_EMAIL` to your own email address.** Only listed addresses
  become administrators; the first account no longer does. The variable
  accepts a comma-separated list, and the auth Compose file refuses to start
  without it. Existing administrators keep their role.
- **Signup is closed by default.** `AUTH_SIGNUP_ENABLED` now defaults to
  `false`. List other people in `AUTH_ALLOWED_EMAILS`, or set
  `AUTH_SIGNUP_ENABLED=true` to keep open registration.
- **Rename `AUTH_URL` to `PUBLIC_URL`** (Helm: `auth.url` to `publicUrl`). The
  old names still work.
- New accounts are created only after the person confirms it on the sign-in
  page, and sign-in codes have six digits.

Enabling accounts for the first time follows
[Upgrading an existing journal](deployment.md#upgrading-an-existing-journal).

## 4. AI

Each user now connects their own OpenAI-compatible provider in
**Settings → AI**. The operator key and the free weekly allowance are removed.
Requests are still logged with status, duration, and token usage, but no
longer with estimated costs.

- Set `AI_CREDENTIAL_ENCRYPTION_KEY` (`openssl rand -base64 32`) on every
  replica. Without it, AI is unavailable. Keep it with your database backups.
- Remove `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_VISION_MODEL`,
  `OPENAI_RESEARCH_MODEL`, `AI_PROVIDED_*`, `AI_TELEMETRY_RETENTION_DAYS`, and
  `AI_TELEMETRY_MAX_PAYLOAD_BYTES`. They are ignored.
  `AI_TELEMETRY_STORE_PAYLOADS` remains. To keep using an internal endpoint
  such as Ollama, list it in `AI_ALLOWED_PRIVATE_ORIGINS` and enter it in
  Settings → AI.
- A migration drops the unused AI usage table and the estimated cost columns;
  existing request logs stay.

## 5. Helm values

The chart schema rejects removed values, so `helm upgrade` fails until they are
gone. Under `openai`, only `credentialExistingSecret`,
`credentialExistingSecretKey`, `allowedPrivateOrigins`, and
`telemetryStorePayloads` remain; delete `existingSecret`, `existingSecretKey`,
`baseUrl`, `visionModel`, `researchModel`, `providedExistingSecret`,
`telemetryRetentionDays`, and `telemetryMaxPayloadBytes`. Add
`AUTH_ADMIN_EMAIL` and, if needed, `AUTH_ALLOWED_EMAILS` or
`AUTH_SIGNUP_ENABLED` to the Secret named by `auth.existingSecret`.

## 6. After the upgrade

Start the new version; migrations run before the application (the Compose
`migrate` service or the chart's migration job). Then check sign-in, a picture
upload, and an export.

The installed app and tabs that keep a device copy download the browser
database engine (about 5 MB) once. Offline changes made with the previous
version are replayed once on first start; open the installed app while online
so they sync. See [Offline journaling](offline.md).
