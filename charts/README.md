# Roastbook Helm chart

Deploys Roastbook, an optional Hodor sidecar, a migration Job, and an external
or bundled PostgreSQL database. Values are documented in `values.yaml` and
validated by `values.schema.json`. Variables and the security boundary are
described in `docs/configuration.md` and `docs/deployment.md`.

## Install

External PostgreSQL (the default):

```bash
helm install roastbook ./charts \
  --set image.tag="latest" \
  --set hodor.password="your-password" \
  --set hodor.secret="$(openssl rand -hex 32)" \
  --set postgresql.external.url="postgresql://roastbook:password@postgres.example:5432/roastbook"
```

Bundled PostgreSQL StatefulSet, for simple installations:

```bash
helm install roastbook ./charts \
  --set image.tag="latest" \
  --set hodor.password="your-password" \
  --set hodor.secret="$(openssl rand -hex 32)" \
  --set postgresql.enabled=true \
  --set postgresql.auth.password="database-password"
```

## Existing Secrets

Prefer existing Secrets over credentials in values. Never put provider keys in
values.

| Value | Secret keys (defaults) |
| --- | --- |
| `postgresql.existingSecret` | `url` (full `DATABASE_URL`) |
| `hodor.existingSecret` | `password`, `secret` |
| `storage.s3.existingSecret` | `access-key-id`, `secret-access-key` |
| `openai.credentialExistingSecret` | `encryption-key` |
| `openai.existingSecret` | `api-key` |
| `openai.providedExistingSecret` | `AI_PROVIDED_*` variables |
| `auth.existingSecret` | Authentication variables, see below |

Key names can be overridden with the matching `*Key` values.

## Storage

Local storage is the default and creates a `ReadWriteOnce` volume, which uses
the `Recreate` strategy and cannot serve multiple replicas. Use S3 or a
`ReadWriteMany` storage class to scale:

```yaml
storage:
  provider: s3
  s3:
    bucket: roastbook
    region: us-east-1
    endpoint: https://s3.example.com
    existingSecret: roastbook-s3
```

## Built-in accounts

```yaml
auth:
  enabled: true
  existingSecret: roastbook-auth
hodor:
  enabled: false
```

The Secret supplies `AUTH_URL`, `AUTH_SECRET`, `EMAIL_FROM`, and `SMTP_URL` or
`EMAIL_PROVIDER=resend` with `RESEND_API_KEY`; optionally
`AUTH_SIGNUP_ENABLED`, `DEPLOYMENT_MODE`, `AUTH_ADMIN_EMAIL`, and
`AUTH_IP_HEADER`. The chart sets `AUTH_ENABLED` from `auth.enabled` and adds a
worker sidecar for exports and deletion; give it temporary disk for ZIP
archives.

## AI

- `openai.credentialExistingSecret` holds the key that encrypts users' own
  provider keys; without it, BYOAI is unavailable.
- Provided AI (authenticated deployments only) uses either
  `openai.existingSecret` with `baseUrl`, `visionModel`, and `researchModel`
  (the `OPENAI_*` variables) or `openai.providedExistingSecret` with
  `AI_PROVIDED_*` keys. The chart rejects both at once.
- `openai.allowedPrivateOrigins` allows exact private origins (self-hosted).
- `openai.telemetryStorePayloads`, `telemetryRetentionDays`, and
  `telemetryMaxPayloadBytes` control diagnostic payload logging.

## MCP

`mcp.enabled=true` creates a private `<release>-mcp` ClusterIP Service and a
NetworkPolicy rule admitting only `mcp.allowedCidrs` and
`mcp.allowedNamespaces` (at least one is required; keep
`networkPolicy.enabled`). OAuth sign-in for MCP clients uses the public
`AUTH_URL` origin and needs `hodor.enabled=false` or a proxy that lets native
clients through.

```yaml
mcp:
  enabled: true
  allowedCidrs: ["100.64.0.0/10"]
  allowedNamespaces: []
  allowedHosts: []
  allowedOrigins: []
```

## Migrations

The migration Job is enabled by default as a hook: `pre-install,pre-upgrade`
for external databases, `post-install,pre-upgrade` for bundled PostgreSQL. Set
`migrations.enabled=false` to migrate outside Helm, or
`migrations.hook.enabled=false` for a revision-suffixed Job. Migration
credentials must own the tables and be able to create the `roastbook_journal`
role.

## Scaling

- `autoscaling.enabled=true` adds a CPU-based HorizontalPodAutoscaler.
- A PodDisruptionBudget renders for multi-replica deployments.
- `networkPolicy.enabled=true` restricts ingress to the application's public
  port.

## Validate changes

```bash
helm lint charts \
  --set hodor.password=audit-password \
  --set hodor.secret=audit-secret \
  --set postgresql.external.url=postgresql://roastbook:password@postgres.example:5432/roastbook
```
