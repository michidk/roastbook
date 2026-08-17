# Demo mode

Roastbook supports a read-only demo edition. The edition is compiled into the
client and server bundles, so a standard production artifact cannot be changed
into a demo by altering its runtime environment.

## Database-backed demo

Build the demo edition, prepare its database, then start it:

```bash
ROASTBOOK_EDITION=demo bun run build
bun run db:migrate
bun run db:seed
bun run start
```

For Docker, build a distinct image:

```bash
docker build --build-arg ROASTBOOK_EDITION=demo -t roastbook:demo .
```

Standard builds omit the argument and compile demo mode to `false`. Helm should
reference either the standard image or a separately published demo image; it
cannot toggle the edition at deployment time.

The enforcement boundary is server-side request middleware. With demo mode
enabled, only GET and HEAD requests proceed; writes, uploads, settings changes,
AI actions, and other POST endpoints fail with a read-only error. The UI also
shows a persistent banner and removes its global create controls. PostgreSQL
and the configured media storage remain required for reads.

Do not rely on hidden buttons as the security boundary. TanStack server
functions are directly callable endpoints, so the server middleware remains
required even when every visible write control is unavailable.

## Proposed database-free demo

A database-free demo should preserve Drizzle and load JSON, CSV, or TypeScript
fixtures into an ephemeral PGlite database. JSON and CSV remain interchange
formats; PGlite supplies the PostgreSQL-compatible query engine.

1. Move the deterministic records in `scripts/seed.ts` into shared fixture
   modules. Keep generated dates fixed so demo rendering and tests are stable.
2. Add two build-time database entry points behind the same `db` import: the
   existing `postgres-js` adapter for standard builds and a PGlite adapter for
   demo builds.
3. Resolve that entry point with a Vite alias based on `ROASTBOOK_EDITION`.
   Standard builds must never import PGlite, allowing tree shaking and separate
   Docker dependency layers to omit its JavaScript and WASM completely.
4. Initialize PGlite once at demo server startup, apply the existing migrations,
   and load the fixtures through shared seed functions. Existing Drizzle reads,
   joins, pagination, and statistics can then remain in place where PGlite
   supports their PostgreSQL SQL.
5. Serve the three bean-package fixtures and other demo media from bundled
   public assets. Fixture records can then use stable root-relative URLs and
   need no writable storage provider.
6. Keep the same read-only request middleware enabled for the PGlite edition.
   A fixture deployment can then be stateless and horizontally replicated.

Contract tests should run the existing query surface against PostgreSQL and
PGlite before the external database is removed from the demo image. Queries
that rely on unsupported PostgreSQL features should be isolated and adapted,
not reimplemented as a general JSON query layer.
