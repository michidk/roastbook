# Demo mode

Roastbook supports a read-only demo edition. The edition is compiled into the
client and server bundles, so a standard production artifact cannot be changed
into a demo by altering its runtime environment.

## Database-free demo

The demo uses an ephemeral PGlite database initialized from bundled migrations
and deterministic seed fixtures. It needs neither `DATABASE_URL` nor writable
media storage. Build its Vercel output with:

```bash
bun run build:demo
```

The build emits `.vercel/output` and copies PGlite's runtime data and WASM into
the server function. Deploy that prebuilt output with:

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
shows a persistent banner and removes its global create controls. The
bean-package seed images are emitted as static assets during the demo build.

Do not rely on hidden buttons as the security boundary. TanStack server
functions are directly callable endpoints, so the server middleware remains
required even when every visible write control is unavailable.

Each serverless instance initializes its own read-only copy. Existing Drizzle
queries, joins, pagination, and statistics therefore keep the same abstraction
as the PostgreSQL edition while the deployment remains stateless.
