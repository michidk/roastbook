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
emailed code, every time: connecting an MCP application, creating API keys and
MCP tokens, changing their or
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

The selected API format applies to image extraction, recommendations, and
research. Responses is the default; Chat Completions remains supported for
image extraction and recommendations. Enter model IDs supported by your
provider; new configurations do not preselect a model. Saving settings does
not run a paid model-capability test. Existing saved models are preserved.

Image extraction accepts up to six images and validates the existing upload
limits before processing them sequentially. Static JPEG, PNG, and WebP images
within 2048 pixels per side and without sensitive photo metadata pass through
without recompression. Other supported images are oriented, resized without
enlargement, stripped of metadata, and converted to JPEG at quality 85. The
prepared batch must fit within 32 MiB before base64 encoding. Animated or
multipage inputs sent directly to extraction are rejected; the picture picker
already converts browser-decodable animation to a still image.

Images use high detail to preserve label text. Smaller file sizes reduce
transfer overhead; image token charges depend on the model, dimensions,
detail level, and image count. JPEG compression alone does not imply a lower
provider bill.

Requests explicitly set `store: false` on both APIs. This requests that the
provider not retain response objects; it does not override its other retention
policies. Calls are not automatically retried. The existing per-process limits
admit image preprocessing as well as inference; they do not implement the
provider's token quota or a distributed limit across replicas.

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

## Picture beautification

Choose **Beautify with AI** on an unedited picture in the gallery or full-size
viewer. Its tooltip and the viewer's visible help explain that AI creates a
version on the same picture record, makes it the main image, and keeps the
original. Provider charges may
apply. The action appears while the AI provider is connected.

Uploads and main-image selection never trigger an AI edit. The previous upload
switch is removed, and saved automatic-beautification preferences no longer
start edits. The first picture is the main image until you choose another with
the star. Deleting the main image selects the oldest remaining picture.

During an edit, the picture shows **Beautifying…** and a spinner. A Sonner
notification changes from loading to success or failure. You can navigate
within Roastbook and upload other pictures while it runs. Keep the tab open;
status tracking does not survive a reload or closing the tab. No percentage is
shown because the provider does not report intermediate progress. If the edit
succeeds but local refresh fails, the notification asks you to refresh rather
than pay for another edit.

Beautification uses the configured user's endpoint and API key with
`POST /images/edits`, independently of the selected chat API format. The provider
must support `gpt-image-1.5` image edits. Each request creates one medium-quality
1024 × 1024 WebP image with a fixed product-photography prompt. The prompt asks
the model to preserve packaging and label text, remove hands and clutter, smooth
creases, and stand the bag on a seamless studio set tinted to its main color,
lit softly and cropped so the bag fills most of the frame.
AI can still alter details. Use **View original** in the full-size viewer to
compare it with the upload, and **View beautified** to switch back.

A picture keeps the same ID and gallery position after beautification. Its
`storagePath` references the displayed file, and `originalStoragePath` retains
the upload. Both versions and their generated sizes count toward the storage
allowance, but they use one gallery slot. Account exports include both files.

The **Beautified** badge identifies an active edit and its Beautify action is
hidden. **Delete beautified version** removes only that version and restores
the original, including its thumbnails. Beautify becomes available again for
another deliberate edit. Deleting the whole picture or its parent removes both
versions. Older edited copies whose originals had already been deleted remain
available, but cannot restore an absent original.

MCP clients can use `beautify_image` and `delete_beautified_image` with the
record's write permission. These use the same owner, storage, and repeat-edit
checks as the UI; see [API picture tools](api.md#permission-reference).

Uploads remain saved if an edit fails. Retry with the gallery's **Beautify**
action. Beautification requires a connection and is unavailable in the static
demo. Offline uploads never trigger a paid edit during sync replay.

### Image-edit costs and PostHog

Each provider request records its model, status, duration and usage in the AI
request log. Image accounting remains available when prompt/response logging
is disabled. It contains no picture content, prompt, or API credential.

For the official `https://api.openai.com/v1` endpoint, the pricing snapshot
`openai-gpt-image-1.5-2026-11-06` uses USD per million tokens:

| Token class | Uncached | Cached |
| --- | --- | --- |
| Text input | $5.00 | $1.25 |
| Image input | $8.00 | $2.00 |
| Image output | $32.00 | Not applicable |

The source is the [OpenAI model pricing page](https://developers.openai.com/api/docs/models/gpt-image-1.5).
Costs use actual response usage, subtract cached tokens before pricing uncached
input, and price image output separately. Missing or inconsistent usage, unknown
cache modality, and custom-provider pricing produce an unknown cost, never an
assumed zero. These are versioned list-price calculations, not invoice amounts;
provider discounts, taxes and future price changes can differ.

Optional server-side PostHog reporting is configured with:

| Variable | Default | Purpose |
| --- | --- | --- |
| `POSTHOG_PROJECT_KEY` | Unset | Enables image-edit AI analytics events |
| `POSTHOG_HOST` | `https://eu.i.posthog.com` | HTTPS PostHog ingestion origin |

Events use `$ai_generation` with actual token counts, explicit USD costs when
known, latency, failure state, pricing version, and the journal owner identifier.
No image bytes, label content, prompt, email, API key or provider error body goes
to PostHog. Failed edits with returned usage retain that usage and its cost.
A PostHog outage does not fail an edit. With no project key, no events are sent.
Set these variables in the application container environment. Docker Compose
passes them through. In Helm, set `posthog.existingSecret` to a Secret containing
the project key under `project-key`, or override
`posthog.existingSecretProjectKeyKey`. Set `posthog.host` for another region.

## Optional usage statistics

On first use, Roastbook asks whether this browser may share usage statistics
with Roastbook's maintainers through PostHog EU. The checkbox starts unchecked.
Declining or dismissing the prompt sends nothing. Change the preference under
**Settings > General > Usage statistics**. It applies to the browser, including
shared journals, rather than to an account. Browsers that send Do Not Track
remain opted out.

Explicit event names cover beans and brews created, AI recommendations created,
AI keys saved, integration credentials created/updated/revoked, account deletion
requested/confirmed, account exports requested, and PWA install prompts opened,
accepted or dismissed, successful installations and install hints dismissed.
No credential values, names, scopes or providers are sent. Events include a
random browser identifier, the application revision and
`deployment_type: self_hosted`. No journal contents, account IDs, email,
private URLs, recordings, prompts or images are included. The server sends the
events to `https://eu.i.posthog.com`; it does not forward browser headers or IP
addresses. PostHog can see the server's network address. No browser analytics
SDK is loaded and no request is sent to PostHog before consent.

A first-party HttpOnly cookie, `roastbook_usage_v1`, remembers the choice for
one year. Only acceptance creates an identifier. Turning statistics off replaces
the identifier with a denial; accepting again creates a new identifier. Previously
sent events are not deleted. Requests already in progress may finish. Blocked
cookies leave collection disabled unless the browser already has a saved consent.

Offline writes, sync replays, API/MCP requests and the demo are excluded. Events
are not queued or backfilled. Delivery failures do not interrupt journal work.
Installation completion uses the browser’s `appinstalled` event where supported;
accepting a prompt is counted separately and does not prove installation. Manual
iOS installations cannot be observed. Browser actions before consent or while
offline are discarded. Counts are approximate and are not an authoritative
record of activity.

| Variable | Default | Purpose |
| --- | --- | --- |
| `USAGE_STATISTICS_DISABLED` | `false` | Disable collection for all browsers |

Docker Compose passes this setting from `.env`. Helm exposes it as
`usageStatistics.disabled`. Restart the application after changing it. The
public PostHog ingestion token is included with Roastbook; no PostHog account
or administrator API key is required. This feature does not use the separate
`POSTHOG_PROJECT_KEY` image-edit cost exporter described above.
