# Demo mode

Roastbook supports a database-backed, read-only demo mode. It is intended for
public product tours that should show realistic seed data without allowing
visitors to change it.

## Database-backed demo

Prepare the database once, then start the application with demo mode enabled:

```bash
bun run db:migrate
bun run db:seed
DEMO_MODE=true bun run start
```

Docker Compose accepts `DEMO_MODE=true` from the host environment. Helm uses
`demoMode: true`.

The enforcement boundary is server-side request middleware. With demo mode
enabled, only GET and HEAD requests proceed; writes, uploads, settings changes,
AI actions, and other POST endpoints fail with a read-only error. The UI also
shows a persistent banner and removes its global create controls. PostgreSQL
and the configured media storage remain required for reads.

Do not rely on hidden buttons as the security boundary. TanStack server
functions are directly callable endpoints, so the server middleware remains
required even when every visible write control is unavailable.

## Proposed database-free demo

A database-free mode should use typed fixture repositories rather than trying
to run Drizzle queries against JSON or duplicating route components.

1. Move the deterministic records in `scripts/seed.ts` into shared fixture
   modules. Keep generated dates fixed so demo rendering and tests are stable.
2. Define small read repository interfaces for each existing domain service,
   such as paginated beans, recipes, roasters, shots, visits, settings, and
   statistics. Route loaders continue calling the current service functions.
3. Implement a PostgreSQL adapter with the existing Drizzle queries and a
   fixture adapter that reads immutable arrays and applies the same filtering,
   sorting, pagination, and relation expansion in memory.
4. Select the adapter once on the server from a distinct mode such as
   `DATA_SOURCE=postgres|fixtures`. Do not branch throughout components or
   expose server configuration through `VITE_` variables.
5. Serve the three bean-package fixtures and other demo media from bundled
   public assets. Fixture records can then use stable root-relative URLs and
   need no writable storage provider.
6. Compute statistics from fixture records through shared pure aggregation
   functions. This avoids maintaining a second set of precomputed dashboard
   numbers that can drift from list and detail pages.
7. Keep the same read-only request middleware enabled for the fixture adapter.
   A fixture deployment can then be stateless and horizontally replicated.

The key prerequisite is the repository boundary. Current domain reads contain
direct Drizzle queries, including SQL-specific statistics and pagination. A
database-free implementation should migrate one domain at a time and run the
same contract tests against both adapters. Once all routes use those contracts,
the fixture image can omit PostgreSQL, migrations, and persistent volumes.
