# Deployment

## Security boundary

Roastbook is a single-user application. It delegates authentication to the
Hodor reverse proxy rather than maintaining application users or sessions.
TanStack server functions are RPC endpoints and must not be exposed by
bypassing that proxy.

- Docker Compose publishes Hodor and keeps the application container private.
- The Helm Service targets Hodor when enabled, and the default NetworkPolicy
  restricts ingress to the selected public container port.
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

## Media reconciliation

Image deletion is recorded in a PostgreSQL cleanup queue before parent records
are deleted. Failed storage deletes remain queued for a later retry. Inspect
database/storage drift without changing it with:

```bash
bun run storage:orphans
```
