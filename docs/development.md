# Development and testing

## Prerequisites

- Bun 1.3.14
- PostgreSQL for application development and database integration tests
- Docker when running the complete stack or S3 integration tests

Install dependencies from the committed lockfile:

```bash
bun install --frozen-lockfile
```

## Development server

Copy the example environment and point `DATABASE_URL` at a development
database. The default URL expects PostgreSQL on localhost.

```bash
cp .env.example .env
bun run dev
```

The development server listens on <http://localhost:3000> and intentionally
does not include the production Hodor authentication gate. It applies pending
committed migrations before accepting requests and repeats that check whenever
Vite restarts after a configuration change. While Vite is running, newly
generated Drizzle migrations are applied serially and trigger a full page
reload. A migration failure during startup prevents the server from starting; a
migration failure detected by the watcher is reported in the development-server
log.

## Database workflow

`bun run db:migrate` is the canonical initialization and upgrade command. It
applies the migrations committed under `drizzle/` and is invoked by the local
development server, Docker Compose, CI, and the Helm migration job.

For a schema change:

1. Update `src/db/schema.ts`.
2. Run `bun run db:generate`.
3. Review the SQL and generated Drizzle metadata.
4. Run `bun run db:migrate` against a disposable development database.
5. Run the database integration tests.

`bun run db:push` bypasses migration generation and is reserved for throwaway
local databases. `bun run db:migrate:cli` exposes the lower-level Drizzle Kit
migration command when its CLI output or flags are needed.

## Tests and quality checks

```bash
bun run check
bun run typecheck
bun run test
bun run lint:deadcode
bun run build
bun run check:client-assets
```

`bun run verify` runs this local sequence in dependency order. The client asset
check runs after the build and enforces ordinary JavaScript and MapLibre chunk
budgets while checking that server-only SDK markers are absent from browser
assets.

The standard `test` command allows environment-dependent integration suites to
report as skipped. `test:coverage` reports unit-test coverage without imposing
a hard threshold. `test:integration` is strict and requires all of:

- `TEST_DATABASE_URL`
- `TEST_S3_ENDPOINT`
- `TEST_S3_ACCESS_KEY_ID`
- `TEST_S3_SECRET_ACCESS_KEY`
- `TEST_S3_BUCKET`

Always use isolated test services. CI provisions PostgreSQL and MinIO, applies
the complete migration chain, and then runs all tests.

## Maintenance scripts

- `bun run storage:backfill-thumbnails` (`scripts/backfill-thumbnails.ts`) is a
  one-shot backfill that generates missing standard and small thumbnails for
  existing images
  across all image tables in local storage under `STORAGE_PATH`, skipping
  images that already have one.
- `bun run db:duplicate-roasters` (`scripts/find-duplicate-roasters.ts`)
  reports roaster rows whose normalized names collide. The default run is a
  dry-run report; `--merge` reassigns beans to the canonical roaster (most
  beans, then oldest id) and deletes the duplicates.
- `bun run db:seed:imported` (`scripts/seed-imported.ts`) is an alternative
  seeder that loads a previously imported coffee-log dataset — gear, beans,
  shots, and their image files — instead of the standard `db:seed` sample data.

## Browser QA

Browser QA is temporary and complements the automated tests. Do not add
Playwright dependencies, configuration, generated tests, screenshots, or
recordings to the application source tree.

For a changed route, verify 375px, 768px, and 1280px widths, including keyboard
access, loading/empty/error states, console errors, and failed network requests.
Store temporary artifacts under `.artifacts/qa/`; the directory is ignored.

## Generated files

- Run `bun run generate-routes` after route-file changes.
- Never edit `src/routeTree.gen.ts` manually.
- Commit a schema migration and its matching `drizzle/meta` changes together.
