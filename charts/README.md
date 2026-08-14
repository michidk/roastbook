# Roastbook Helm chart

This chart deploys Roastbook, an optional Hodor authentication sidecar, a
migration Job, and either an external or opt-in bundled PostgreSQL database.
Values are documented in `values.yaml` and validated by `values.schema.json`.

## Install with external PostgreSQL

```bash
helm install roastbook ./charts \
  --set image.tag="latest" \
  --set hodor.password="your-password" \
  --set hodor.secret="$(openssl rand -hex 32)" \
  --set postgresql.external.url="postgresql://roastbook:password@postgres.example:5432/roastbook"
```

Instead of putting a URL in Helm values, provide a Secret containing the full
connection URL:

```bash
helm install roastbook ./charts \
  --set image.tag="latest" \
  --set hodor.existingSecret="roastbook-hodor" \
  --set postgresql.existingSecret="roastbook-database" \
  --set postgresql.existingSecretKey="url"
```

The Hodor Secret must contain `password` and `secret` by default. Override the
key names with `hodor.existingSecretPasswordKey` and
`hodor.existingSecretSecretKey`.

## Install with bundled PostgreSQL

```bash
helm install roastbook ./charts \
  --set image.tag="latest" \
  --set hodor.password="your-password" \
  --set hodor.secret="$(openssl rand -hex 32)" \
  --set postgresql.enabled=true \
  --set postgresql.auth.password="database-password"
```

The bundled database is intended for simple self-hosted installations. Use an
externally managed PostgreSQL service when database lifecycle, backups, or high
availability are managed separately.

## Storage

Local storage is the default and creates a persistent volume:

```yaml
storage:
  provider: local
  local:
    path: /data/uploads
    size: 10Gi
    storageClass: ""
    accessMode: ReadWriteOnce
```

For S3-compatible storage, provide the bucket and an existing credentials
Secret:

```yaml
storage:
  provider: s3
  s3:
    bucket: roastbook
    region: us-east-1
    endpoint: https://s3.example.com
    existingSecret: roastbook-s3
```

The Secret keys default to `access-key-id` and `secret-access-key`. Local
`ReadWriteOnce` storage cannot be used with multiple replicas; use S3 or a
storage class that supports `ReadWriteMany`.

## Optional AI configuration

Set `openai.existingSecret` to a Secret containing an API key. The key defaults
to `api-key`. `openai.baseUrl`, `openai.visionModel`, and
`openai.researchModel` support compatible providers and model overrides.

## Migrations

The migration Job is enabled by default. With hooks enabled, external databases
use `pre-install,pre-upgrade`; bundled PostgreSQL uses
`post-install,pre-upgrade` so the database exists before the first migration.

Set `migrations.enabled=false` when migrations are managed outside Helm, or
`migrations.hook.enabled=false` to render an ordinary revision-suffixed Job.

## Scaling and availability

- `autoscaling.enabled=true` creates a CPU-based HorizontalPodAutoscaler.
- The PodDisruptionBudget renders only for a multi-replica deployment.
- `networkPolicy.enabled=true` restricts ingress to the active public container
  port.
- Local `ReadWriteOnce` storage uses the `Recreate` deployment strategy.
- S3 and shared `ReadWriteMany` storage use the configured rolling strategy.

## Validate changes

```bash
helm lint charts \
  --set hodor.password=audit-password \
  --set hodor.secret=audit-secret \
  --set postgresql.external.url=postgresql://roastbook:password@postgres.example:5432/roastbook
```
