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

## Component stories

Storybook runs independently of the application server and needs no database,
S3 service, or API credentials:

```bash
bun run storybook
```

Open <http://localhost:6006>. Use the theme toolbar to switch between light and
dark, and the viewport toolbar for 375px, 768px, and 1280px layouts. Controls
edit component props, and Actions records callback arguments. Editable ratings,
measurements, tags, filters, pagination, and the timer respond to interactions.

The initial library covers buttons, badges, inputs, cards and loading states,
star ratings, number inputs, bean and café cards, metrics, empty states, image
fallbacks, collection toolbars, pagination, deletion dialogs, extraction balance,
sensory ratings, taste tags, and the brew timer. Each component has an automatic
documentation page alongside its stories.

Stories live beside components as `*.stories.tsx`, with configuration under
`.storybook/`. The preview provides the real stylesheet, tooltip provider,
toasts, and an in-memory TanStack router with fictional application settings.
Override `parameters.appSettings` for a story that needs another number format
or taste profile. Link destinations use memory history and do not navigate the
Storybook host; this library covers components rather than complete app routes.
Coffee packaging comes from the existing fictional seed assets. The small
thumbnail and café logo under `.storybook/public/` are derived from those assets.

```bash
bun run build:storybook
```

This builds a static site under `storybook-static/`, which is ignored by Git.
Build it when changing Storybook configuration or stories, in addition to the
usual source checks. Stories with a `play` function run interaction assertions
when opened in Storybook.

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

`bun run db:seed` loads the same fictional records as the database-free public
demo and installs its bean-package images through the configured storage
provider. Run it against an empty database after applying migrations.

## Tests and quality checks

```bash
bun run check
bun run typecheck
bun run test
bun run lint:deadcode
bun run build
bun run check:client-assets
bun run check:pwa
```

`bun run verify` runs this local sequence in dependency order. The client asset
check runs after the build and enforces ordinary JavaScript and MapLibre chunk
budgets while checking that server-only SDK markers are absent from browser
assets. The PWA check also runs after the build and validates the manifest,
icons, offline page, and generated service worker.

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

- `bun run sync:ai-pricing` refreshes the committed AI pricing snapshot from
  the packaged models.dev catalog. The application reads that snapshot at
  runtime, so deployments do not depend on a live pricing request.
- `bun run storage:backfill-thumbnails` (`scripts/backfill-thumbnails.ts`) is a
  one-shot backfill that generates missing standard and small thumbnails for
  existing images
  across all image tables in local storage under `STORAGE_PATH`, skipping
  images that already have one.
- `bun run db:duplicate-roasters` (`scripts/find-duplicate-roasters.ts`)
  reports roaster rows whose normalized names collide. The default run is a
  dry-run report; `--merge` reassigns beans to the canonical roaster (most
  beans, then oldest id) and deletes the duplicates.

## Browser QA

Browser QA is temporary and complements the automated tests. Do not add
Playwright dependencies, configuration, generated tests, screenshots, or
recordings to the application source tree.

For a changed route, verify 375px, 768px, and 1280px widths, including keyboard
access, loading/empty/error states, console errors, and failed network requests.
Store temporary artifacts under `.artifacts/qa/`; the directory is ignored.

## Progressive web app

Roastbook ships a web app manifest and a small hand-written service worker.
The worker is registered only in production builds; `bun run dev` never
registers it, so Vite HMR is not served from a stale cache. Build and start a
production server to test it:

```bash
bun run build
bun run start
```

PWA installation requires a secure context: HTTPS in production, or
`http://localhost` during development. In the browser's Application panel,
check the manifest and service worker, then switch the network to offline and
reload to see the offline behaviour. The worker caches the offline page,
manifest, icons, hashed `/assets/*` files, and bounded app documents for offline
boot. Brews created offline are queued in IndexedDB and synchronized; see
[Offline journaling](offline.md).

`bun run check:pwa` validates the manifest, icons, offline page, and built
service worker after a build. For the demo output, pass its static directory:
`bun run check:pwa .vercel/output/static`. The worker's runtime behavior
(offline fallback, precache serving, request exclusions, and update handling) is
covered by `scripts/service-worker.test.ts` in `bun run test`. If a previous
production run registered a service worker on the same localhost origin,
unregister it from the Application panel before returning to `bun run dev`.

## Design files

`design/` is a separate package, outside the application's dependencies and
type checks, that captures every view into editable OpenPencil documents and
runs the OpenPencil editor for them. See `design/README.md`.

## Generated files

- Run `bun run generate-routes` after route-file changes.
- Never edit `src/routeTree.gen.ts` manually.
- Commit a schema migration and its matching `drizzle/meta` changes together.
