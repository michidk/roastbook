# Demo mode

Roastbook supports a read-only demo edition. The edition is compiled into the
client and server bundles, so a standard production artifact cannot be changed
into a demo by altering its runtime environment.

## Database-free demo

The demo uses an ephemeral PGlite database loaded from a build-generated
snapshot. The snapshot is derived from the bundled migrations and deterministic
seed fixtures, so cold starts do not need to migrate and seed a new database.
It needs neither `DATABASE_URL` nor writable media storage. Build its Vercel
output with:

```bash
bun run build:demo
```

The build emits `.vercel/output` and copies the demo snapshot plus the PGlite
runtime data and WASM needed to restore it into the server function. Demo-only
aliases replace disabled storage, image-processing, and AI integrations so
their production dependencies are not shipped in the read-only function.
Deploy that prebuilt output with:

```bash
vercel deploy --prebuilt
```

`vercel.json` also selects `build:demo` for Git-connected deployments.
Standard `bun run build` and Docker builds use PostgreSQL, compile demo mode to
`false`, and do not install the PGlite development dependency in the production
image. The edition cannot be toggled at runtime.

The enforcement boundary is server-side request middleware. With demo mode
enabled, only GET and HEAD requests proceed; writes, uploads, settings changes,
AI actions, and other POST endpoints fail with a read-only error. The UI also
shows a persistent banner, prevents form submissions, and disables its global
create controls. The bean-package seed images are emitted as static assets
during the demo build. All demo business and product records are fictional.
Roasters and cafés have no website URLs, and five bundled abstract favicon
marks are reused across them without making network requests.

Do not rely on hidden buttons as the security boundary. TanStack server
functions are directly callable endpoints, so the server middleware remains
required even when every visible write control is unavailable.

Each serverless instance initializes its own read-only copy. Existing Drizzle
queries, joins, pagination, and statistics therefore keep the same abstraction
as the PostgreSQL edition while the deployment remains stateless. The public
demo warns that its first request may be slower while a serverless instance
starts and restores the database snapshot.
