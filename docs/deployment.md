# Deployment

A read-only demo build deploys to Vercel — see
[docs/demo-mode.md](demo-mode.md).

## Security boundary

Roastbook supports two self-hosted configurations and a hosted multi-user
configuration. Every account has a private coffee journal. Administrator status
allows listing users, changing their roles, and deleting accounts. It does not
grant access to another person's journal through application endpoints.

| Configuration | Authentication | Journal ownership |
| --- | --- | --- |
| `docker-compose.yaml` | Hodor, auth disabled | Shared journal |
| `docker-compose.auth.yaml` | Email codes and passkeys | Private journals |
| Hosted | Built-in auth | Open signup |

Hodor is optional when built-in authentication is enabled. With both disabled,
everyone who can reach the application can access the default journal. Protect
that installation with a trusted proxy or private network. Hodor remains an
optional additional gate, with reserved paths `/_gate/login`, `/_gate/logout`,
and `/_gate/health`.

Terminate TLS in production and overwrite the configured client IP header at
the trusted proxy. Keep the direct app port private and reject requests with
unexpected Host values. In hosted mode set `AUTH_ADMIN_EMAIL` before accepting
signups. In self-hosted mode keep initial setup private until the first verified
user has claimed the journal.

Journal requests use a transaction-local identity and the restricted
`roastbook_journal` PostgreSQL role. Forced row-level security covers every
journal table, including images, preferences, AI logs, and replication state.
Ownership triggers reject references to another account's records. A separate
control connection handles authentication, bootstrap, administrative account
actions, and durable jobs. Use the same database owner for migrations and the
application. Migration 0066 creates and grants a restricted NOLOGIN role and
requires permission to create roles or an administrator-prepared equivalent.
The runtime database owner does not need superuser or BYPASSRLS privileges.

## Upgrading an existing journal

1. Back up PostgreSQL and uploaded files and verify that both can be restored.
2. Stop application writers and apply all committed migrations with
   `bun run db:migrate` using the application's database owner.
3. Keep `AUTH_ENABLED=false` to retain the shared journal and existing offline
   owner `local`. Existing data receives that default ownership.
4. To adopt accounts, configure email, `AUTH_URL`, and `AUTH_SECRET`, enable
   authentication, and sign in privately as the intended first administrator.
   The first verified self-hosted account claims the existing journal once,
   inside a locked transaction.
5. Start the account worker and verify sign-in, image access, and an export
   before reopening the instance to other users.

Sync pending offline changes before enabling accounts. Legacy browser caches
are preserved under `local` and are never silently assigned to a new account.
Disabling authentication on a database with multiple accounts is rejected;
consolidating journals requires an explicit migration and backup.

Existing shottimer and MCP clients must receive newly generated bearer tokens.
Legacy shottimer hashes cannot identify an account and are not accepted.

## MCP

`/api/mcp` serves stateless Streamable HTTP with protocol 2026-07-28.
With built-in accounts enabled, add the canonical endpoint URL to an MCP client
and sign in through its browser authorization flow. Roastbook publishes OAuth
resource and authorization-server discovery, supports Client ID Metadata
Documents and dynamic client registration, and requires Authorization Code
with PKCE S256. Approve read access, optional brew creation, and optional
background access on the consent page. Each application receives access to
one private journal. There are no account administration or AI credential tools.

For Codex with built-in authentication:

```bash
codex mcp add roastbook --url https://coffee.example.com/api/mcp
codex mcp login roastbook
```

Access tokens expire after five minutes. Background authorization uses rotating
refresh tokens that expire after 30 days without renewal. Reusing a rotated refresh
token is rejected. Disconnect an application in Account settings to invalidate
its existing access tokens and refresh tokens immediately. Deleting the account
or disabling a client also blocks access. Pausing MCP and per-tool switches take
effect on the next request.

Manual bearer tokens remain available for clients without browser authorization
and for shared installations with `AUTH_ENABLED=false`. Create them under
Settings > AI access (MCP), or Account > Connected applications. They are shown
once, stored as hashes, expire after one year, and allow all enabled tools in
their owner's journal. Store the token in the client environment:

```bash
codex mcp add roastbook --url http://127.0.0.1:3001/api/mcp \
  --bearer-token-env-var ROASTBOOK_MCP_TOKEN
```

The ten read tools cover brews, beans, recipes, gear, roasters, brewing methods,
and statistics. `create_brew` logs a brew. No tool deletes or edits existing
data. Tool availability and audit history belong to the account. A shottimer
token cannot authenticate MCP, and an MCP credential cannot authenticate
browser or account endpoints.

Every MCP request needs an access token. DPoP-bound tokens also require a valid
proof for the canonical public URL, including behind reverse proxies.
The endpoint accepts POST only,
limits request bodies to 1 MiB with a ten-second read deadline, and allows 120
requests per journal per minute across application replicas. Read-only OAuth
clients cannot call the write tool, even by bypassing discovery.

Set `AUTH_URL` to the externally reachable HTTPS origin. Keep the same
`AUTH_SECRET` on all replicas and across restarts; it encrypts OAuth signing
keys stored in PostgreSQL. Back up these keys with the database. Discovery at
`/.well-known/oauth-protected-resource/api/mcp` and
`/.well-known/oauth-authorization-server/api/auth`, `/api/auth/jwks`, OAuth
endpoints under `/api/auth/oauth2/`, `/login`, `/oauth/consent`, and `/api/mcp`
must be reachable through the same origin. Avoid an additional interactive
proxy gate on this origin when native MCP clients need OAuth.

Host and Origin allowlists also apply, with no CORS headers. Configure
`MCP_ALLOWED_HOSTS` for additional public or VPN hostnames. The canonical
`AUTH_URL` hostname is allowed automatically. Compose's Hodor example
keeps the device port on loopback; the authenticated example serves MCP on
the app origin. Helm can create a private integration Service with CIDR or
namespace restrictions. Keep those restrictions when a private endpoint is
sufficient. See [chart documentation](../charts/README.md#mcp).

Client metadata fetches accept HTTPS only, reject private and special-use DNS
addresses, pin the approved address while preserving TLS hostname verification,
and refuse redirects. Client registration and token endpoints have additional
IP rate limits. Configure the trusted proxy to overwrite `AUTH_IP_HEADER`;
clients must not control that header.

Shottimer devices use separate user-bound bearer tokens and must also be enabled
in that journal. Hodor's shottimer bypass delegates authentication to this token
check. See [Shottimer API](shottimer.md).

## Accounts, exports, and deletion

Accounts use email addresses without usernames or display names. Account
settings support email changes approved through the old address and verified
through the new address, passkey management, and
signing out other devices. Admin users have a separate `/admin/users` page.
The last active administrator cannot be demoted or deleted.

Run `bun run worker` with the same database, email, and storage configuration as
the app. The authenticated Compose example runs a worker service; Helm runs a
worker sidecar when `auth.enabled=true`. Multiple workers claim jobs through
PostgreSQL leases and locks. They need temporary disk space for ZIP archives.
Monitor worker errors, job age, and disk/storage usage.

Users may request one export per hour after signing in again. The ZIP contains
`account.json`, a versioned manifest, JSON Lines data files, and original
images.
It excludes authentication credentials and integration secrets. Downloads are
authorized by account and expire after 24 hours. The worker removes expired
archives. Exports retry up to four times. Large archives temporarily serialize
writes to that journal to keep their data consistent.

Self-deletion requires an emailed one-time confirmation followed by an explicit
button press while signed in to the same account. Admin deletion requires a
fresh admin session and explicit UI confirmation. Both revoke sessions and
integration tokens immediately, then queue file and database cleanup. Failed
deletions retry with backoff, capped at one hour between attempts. Database
backups retain historical data until the operator's backup retention expires.

## PWA and HTTPS

Roastbook is installable as a progressive web app. Installation requires a
secure context, so terminate TLS at an ingress or reverse proxy in front of
Hodor (or use an equivalent HTTPS proxy) for production deployments. Plain
`http://localhost` also counts as secure for local testing.

Until a device installs the app or dismisses it, a banner below the
header offers installation for offline use. Chromium browsers get an
**Install** button that opens the native prompt; iOS Safari, which has no
prompt API, gets the Share → Add to Home Screen steps. Dismissal is stored in
the browser's local preferences.

The application serves `/sw.js`, `/manifest.json`, and `/offline.html` with
`Cache-Control: no-cache`. Keep those responses uncached at any additional CDN
or reverse proxy. Hodor passes them through without special configuration.

Offline pending brews and reference data live in the browser's IndexedDB. No
server configuration is required, but apply the committed migrations before
deploying a client that queues brews so the idempotency column exists.

## Docker image

The Docker build compiles JavaScript on the build host architecture and installs
runtime dependencies for the target architecture. Nitro's traced dependencies
are removed so native modules such as Sharp resolve from that target install.

Build and run the application directly when an external database and reverse
proxy are already available:

```bash
docker build -t roastbook .
docker run --rm \
  -e DATABASE_URL="postgresql://..." \
  roastbook bun run db:migrate
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  roastbook
```

The direct application port uses the selected authentication mode. For a
shared journal, put Hodor or an equivalent gate in front of it.

## Docker Compose

`docker-compose.yaml` includes PostgreSQL, a one-shot migration service, the
application, and Hodor. The application waits for a successful migration and
only Hodor publishes a host port.

```bash
cp .env.example .env
# Replace the Hodor password and signing secret.
docker compose up --build
```

### Built-in multi-user authentication

Use this standalone file instead of combining it with the Hodor example:

```bash
# Set AUTH_URL, AUTH_SECRET, EMAIL_FROM, and SMTP_URL or RESEND_API_KEY in .env.
docker compose -f docker-compose.auth.yaml up --build
```

Set `EMAIL_PROVIDER=resend` to use Resend. Set `AUTH_SIGNUP_ENABLED=false` after
initial setup to close registration while existing users can still sign in.
Use `AUTH_ADMIN_EMAIL` and `DEPLOYMENT_MODE=hosted` for a hosted deployment.
Both files share volume names within a Compose project; back up and stop the
old stack before changing configuration.

### Upgrading PostgreSQL from an earlier major version

PostgreSQL data volumes are tied to a major version, so a volume created by
`postgres:16` will not start under `postgres:18`. Upgrade existing Compose
deployments with a dump and restore:

```bash
# 1. Back up the whole cluster while the old image is still running.
docker compose exec postgres pg_dumpall -U roastbook > roastbook-backup.sql

# 2. Verify the backup before deleting anything.
tail -1 roastbook-backup.sql   # must end with "cluster dump complete"

# 3. Stop the stack and remove the old data volume.
docker compose down
docker volume rm "$(basename "$PWD")_postgres_data"

# 4. Start PostgreSQL 18 with an empty volume and restore.
docker compose up -d postgres
docker compose exec -T postgres psql -U roastbook -d roastbook \
  < roastbook-backup.sql

# 5. Start the rest of the stack.
docker compose up -d
```

The restore reports two `already exists` errors for the bootstrap role and
database; they are harmless. If the Compose file was already updated to
`postgres:18` before backing up, temporarily change the `postgres` service
image back to `postgres:16`, run `docker compose up -d postgres`, and follow
the steps above from the beginning.

## Helm

The chart defaults to an external PostgreSQL database:

```bash
helm install roastbook ./charts \
  --set hodor.password="your-password" \
  --set hodor.secret="$(openssl rand -hex 32)" \
  --set image.tag="latest" \
  --set postgresql.external.url="postgresql://roastbook:password@postgres.example:5432/roastbook"
```

For the opt-in bundled PostgreSQL StatefulSet:

```bash
helm install roastbook ./charts \
  --set hodor.password="your-password" \
  --set hodor.secret="$(openssl rand -hex 32)" \
  --set image.tag="latest" \
  --set postgresql.enabled=true \
  --set postgresql.auth.password="database-password"
```

Prefer existing Kubernetes Secrets in production. The chart accepts a full
`DATABASE_URL` through `postgresql.existingSecret`, Hodor credentials through
`hodor.existingSecret`, S3 credentials through
`storage.s3.existingSecret`, and the AI credential encryption key through
`openai.existingSecret`. Users supply their own AI provider keys in Settings.
Built-in authentication uses
`auth.enabled=true` and `auth.existingSecret`; see the chart README for its
required environment keys. Set `hodor.enabled=false` when using built-in login
without the extra proxy gate.

The migration Job applies committed migrations during installs and upgrades.
See `charts/README.md` for all supported database, storage, scaling, and secret
configurations.

## Storage and scaling

Local storage uses a persistent volume and defaults to `ReadWriteOnce`. The
chart rejects multi-replica local deployments unless the selected storage class
supports `ReadWriteMany`. Prefer S3-compatible storage when enabling multiple
replicas or the HorizontalPodAutoscaler.

Local `ReadWriteOnce` upgrades use a `Recreate` deployment strategy to avoid
overlapping writers. S3 and shared-RWX deployments use rolling updates.

AI extraction, research, and remote-image request limits are maintained per
application process. Multi-replica deployments should enforce an additional
shared limit at the ingress or API gateway.

## Media reconciliation

Image deletion is recorded in a PostgreSQL cleanup queue before parent records
are deleted. Failed storage deletes remain queued and use exponential backoff
before a later retry. Inspect database/storage drift without changing it with:

```bash
bun run storage:orphans
```
