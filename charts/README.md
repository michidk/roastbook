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
`openai.researchModel` support compatible providers and model overrides; they
only take effect when `openai.existingSecret` is set, because the deployment
template renders them inside that guard.

Detailed AI prompts and responses are disabled by default. Set
`openai.telemetryStorePayloads=true` only for short-lived diagnostics and tune
the bounded retention and payload size with `telemetryRetentionDays` and
`telemetryMaxPayloadBytes`.

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
  port on application pods. The bundled PostgreSQL and migration pods are not
  selected by this web-ingress policy.
- Local `ReadWriteOnce` storage uses the `Recreate` deployment strategy.
- S3 and shared `ReadWriteMany` storage use the configured rolling strategy.

## Built-in accounts

Set `auth.enabled=true`, `auth.existingSecret=roastbook-auth`, and
`hodor.enabled=false` to use private accounts without Hodor. The referenced
Secret supplies `AUTH_URL`, `AUTH_SECRET`, `EMAIL_FROM`, and either `SMTP_URL`
or `EMAIL_PROVIDER=resend` with `RESEND_API_KEY`. It may also contain
`AUTH_SIGNUP_ENABLED`, `DEPLOYMENT_MODE`, `AUTH_ADMIN_EMAIL`, and
`AUTH_IP_HEADER`. The chart explicitly sets `AUTH_ENABLED` from `auth.enabled`.
Use an HTTPS origin and a trusted ingress that overwrites the client IP header.

```yaml
auth:
  enabled: true
  existingSecret: roastbook-auth
hodor:
  enabled: false
```

A worker sidecar processes exports and deletion with the same database and
storage configuration. Give it temporary disk capacity for ZIP archives.
Migration credentials must own the application tables and be able to create
and grant the restricted `roastbook_journal` role. Hosted mode also requires
`DEPLOYMENT_MODE=hosted` and `AUTH_ADMIN_EMAIL`. See the
[upgrade guide](../docs/deployment.md#upgrading-an-existing-journal).

## MCP

MCP requires an owner-bound bearer token in both authentication modes. Create
and revoke it in Settings > AI access (MCP). It expires in one year. Account
removal revokes it immediately. Host and Origin validation also applies.

Set `mcp.enabled=true` to create a private `<release>-mcp` ClusterIP Service
and a NetworkPolicy rule admitting only `mcp.allowedCidrs` and
`mcp.allowedNamespaces`. At least one is required, and `networkPolicy.enabled`
must stay on. The application additionally allows the Service hostnames and
configured extra hosts/origins. Built-in auth can also serve MCP on its public
origin when that hostname is included in its allowlist.

```yaml
mcp:
  enabled: true
  allowedCidrs: ["100.64.0.0/10"]
  allowedNamespaces: []
  allowedHosts: []
  allowedOrigins: []
```

Configure the client with `/api/mcp` and an `Authorization: Bearer` header.
There is no MCP OAuth discovery or consent flow. Tool policy and audit history
belong to the token's account.

## Validate changes

```bash
helm lint charts \
  --set hodor.password=audit-password \
  --set hodor.secret=audit-secret \
  --set postgresql.external.url=postgresql://roastbook:password@postgres.example:5432/roastbook
```
