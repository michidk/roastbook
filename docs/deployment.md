# Deployment

Roastbook ships a Docker image, two Docker Compose files, and a Helm chart.
Configuration variables are listed in [Configuration](configuration.md). The
browser-local demo is described in [Demo mode](demo-mode.md).

## Security boundary

| Setup | Authentication | Journals |
| --- | --- | --- |
| `docker-compose.yaml` | Hodor, `AUTH_ENABLED=false` | One shared |
| `docker-compose.auth.yaml` | Email codes and passkeys | Private |

- With built-in authentication disabled, anyone who reaches the application can
  use the shared journal. Put Hodor, an equivalent authenticating proxy, or a
  private network in front of it. Hodor reserves `/_gate/login`,
  `/_gate/logout`, and `/_gate/health`.
- Terminate TLS at a reverse proxy, keep the application port private, reject
  unexpected Host values, and have the proxy overwrite `AUTH_IP_HEADER`. Do not
  cache authenticated HTML, RPC, media, or export responses.
- Keep a new self-hosted instance private until the first verified account has
  claimed the journal. With `DEPLOYMENT_MODE=hosted`, set `AUTH_ADMIN_EMAIL`
  before accepting signups.
- Administrators manage accounts but cannot read other journals.
- Journal queries run as the restricted `roastbook_journal` PostgreSQL role
  under forced row-level security. Run migrations as the application's
  database owner; it must be able to create and grant that NOLOGIN role (or an
  administrator creates it beforehand). Superuser and BYPASSRLS are not needed.
- Budget up to 26 PostgreSQL connections per application process, plus
  workers and migrations. Overloaded journals return `429` with
  `Retry-After: 1`.

## Upgrading an existing journal

1. Back up PostgreSQL and uploaded files and verify the restore.
2. Stop writers and run `bun run db:migrate` as the database owner.
3. Keep `AUTH_ENABLED=false` to keep the shared journal; existing data stays
   owned by the default identity.
4. To adopt accounts, sync pending offline changes, configure email,
   `AUTH_URL`, and `AUTH_SECRET`, enable authentication, and sign in privately
   as the intended administrator; that first account claims the journal.
5. Start the account worker and check sign-in, images, and an export before
   admitting other users.

Shottimer devices and MCP clients need newly generated tokens after enabling
accounts.

## MCP

`/api/mcp` serves stateless Streamable HTTP. It needs a user-bound access token
in both authentication modes and exposes read tools plus `create_brew`; no
tool edits or deletes data.

With built-in accounts, MCP clients sign in through OAuth (Authorization Code
with PKCE) and a consent page on the `AUTH_URL` origin:

```bash
codex mcp add roastbook --url https://coffee.example.com/api/mcp
codex mcp login roastbook
```

For OAuth, `/.well-known/oauth-protected-resource/api/mcp`,
`/.well-known/oauth-authorization-server/api/auth`, `/api/auth/*`, `/login`,
`/oauth/consent`, and `/api/mcp` must be reachable on that origin without an
interactive proxy gate in front. Keep `AUTH_SECRET` identical across replicas
and restarts; it encrypts the OAuth signing keys stored in PostgreSQL.

Without accounts, or for clients without browser sign-in, create a manual token
under Settings > AI access (MCP). It is shown once and expires after one year:

```bash
codex mcp add roastbook --url http://127.0.0.1:3001/api/mcp \
  --bearer-token-env-var ROASTBOOK_MCP_TOKEN
```

Requests must match the Host and Origin allowlists (`MCP_ALLOWED_HOSTS`,
`MCP_ALLOWED_ORIGINS`). `docker-compose.yaml` publishes the MCP port on
loopback only; the Helm chart can create a restricted private Service (see
`charts/README.md`). Shottimer devices use their own tokens; see
[Shottimer API](shottimer.md).

## Accounts and worker

Run `bun run worker` with the same database, email, and storage configuration
as the application. It builds account exports and processes account deletion.
`docker-compose.auth.yaml` includes a worker service and Helm adds a worker
sidecar when `auth.enabled=true`. Workers coordinate through PostgreSQL, so
several may run; give them temporary disk space for ZIP archives. Database
backups keep deleted data until their retention expires.

## PWA and HTTPS

The installable PWA and offline journal need a secure context: serve
production over HTTPS (`http://localhost` works for testing). Keep `/sw.js`,
`/manifest.json`, and `/offline.html` uncached at any CDN or proxy; the
application sends them with `Cache-Control: no-cache`.

## Docker image

Use the image directly when PostgreSQL and a reverse proxy already exist:

```bash
docker build -t roastbook .
docker run --rm -e DATABASE_URL="postgresql://..." roastbook bun run db:migrate
docker run --rm -p 3000:3000 -e DATABASE_URL="postgresql://..." roastbook
```

## Docker Compose

`docker-compose.yaml` runs PostgreSQL, a migration job, the application, and
Hodor; only Hodor publishes a port.

```bash
cp .env.example .env
# Replace the Hodor password and signing secret.
docker compose up --build
```

For private accounts use the standalone `docker-compose.auth.yaml` instead,
without Hodor:

```bash
# Set AUTH_URL, AUTH_SECRET, EMAIL_FROM, and SMTP_URL or RESEND_API_KEY in .env.
docker compose -f docker-compose.auth.yaml up --build
```

Set `AUTH_SIGNUP_ENABLED=false` after setup to close registration. Both files
use the same volume names; back up and stop one stack before switching.

### Upgrading PostgreSQL to a new major version

PostgreSQL data volumes are tied to a major version. Move a volume created by
`postgres:16` to the current `postgres:18` image with a dump and restore,
starting while the old image still runs (temporarily set it back in the
Compose file if needed):

```bash
docker compose exec postgres pg_dumpall -U roastbook > roastbook-backup.sql
tail -1 roastbook-backup.sql   # must end with "cluster dump complete"
docker compose down
docker volume rm "$(basename "$PWD")_postgres_data"
docker compose up -d postgres
docker compose exec -T postgres psql -U roastbook -d roastbook \
  < roastbook-backup.sql
docker compose up -d
```

Two `already exists` errors for the bootstrap role and database are harmless.

## Helm

```bash
helm install roastbook ./charts \
  --set image.tag="latest" \
  --set hodor.password="your-password" \
  --set hodor.secret="$(openssl rand -hex 32)" \
  --set postgresql.external.url="postgresql://roastbook:password@postgres.example:5432/roastbook"
```

A migration Job runs on install and upgrade. See `charts/README.md` for bundled
PostgreSQL, existing Secrets, built-in accounts, storage, AI, MCP, and scaling.

## Storage and scaling

Local storage needs a persistent volume; multiple replicas require
`ReadWriteMany` or, preferably, S3-compatible storage. AI and remote-image rate
limits are per process, so add a shared limit at the ingress for multiple
replicas.

Image deletions are queued in PostgreSQL and retried. Inspect database and
storage drift without changing anything:

```bash
bun run storage:orphans
```
