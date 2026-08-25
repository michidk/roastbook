# Deployment

A read-only demo build deploys to Vercel — see [docs/demo-mode.md](demo-mode.md).

## Security boundary

Roastbook is a single-user application. It delegates authentication to the
Hodor reverse proxy rather than maintaining application users or sessions.
TanStack server functions are RPC endpoints and must not be exposed by
bypassing that proxy.

- Docker Compose publishes Hodor and keeps the application container private.
- The Helm Service targets Hodor when enabled, and the default NetworkPolicy
  restricts ingress to the selected public container port on application pods
  without selecting bundled PostgreSQL or migration pods.
- If Hodor is disabled, provide an equivalent authenticated proxy or deploy
  only on a trusted network.
- Configure TLS in production. Helm enables secure cookies when ingress TLS is
  configured; Compose users set `HODOR_SECURE_COOKIE=true`.

Reserved Hodor paths are `/_gate/login`, `/_gate/logout`, and `/_gate/health`.

## Docker image

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

The direct application port is unauthenticated. Put Hodor or an equivalent gate
in front of it.

## Docker Compose

`docker-compose.yaml` includes PostgreSQL, a one-shot migration service, the
application, and Hodor. The application waits for a successful migration and
only Hodor publishes a host port.

```bash
cp .env.example .env
# Replace the Hodor password and signing secret.
docker compose up --build
```

### Upgrading PostgreSQL from an earlier major version

PostgreSQL data volumes are tied to a major version, so a volume created by
`postgres:16` will not start under `postgres:17`. Upgrade existing Compose
deployments with a dump and restore:

```bash
# 1. Back up the whole cluster while the old image is still running.
docker compose exec postgres pg_dumpall -U roastbook > roastbook-backup.sql

# 2. Verify the backup before deleting anything.
tail -1 roastbook-backup.sql   # must end with "cluster dump complete"

# 3. Stop the stack and remove the old data volume.
docker compose down
docker volume rm "$(basename "$PWD")_postgres_data"

# 4. Start PostgreSQL 17 with an empty volume and restore.
docker compose up -d postgres
docker compose exec -T postgres psql -U roastbook -d roastbook \
  < roastbook-backup.sql

# 5. Start the rest of the stack.
docker compose up -d
```

The restore reports two `already exists` errors for the bootstrap role and
database; they are harmless. If the Compose file was already updated to
`postgres:17` before backing up, temporarily change the `postgres` service
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
`storage.s3.existingSecret`, and an AI key through `openai.existingSecret`.

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
