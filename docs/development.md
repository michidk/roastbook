# Development and testing

## Prerequisites

- Bun 1.4.4
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
does not include Hodor. Set `AUTH_ENABLED=true` and configure email delivery to
exercise built-in accounts. A local SMTP capture service works for development.
Run `bun run worker` separately to process exports and account deletion. The
same request authentication and RLS boundary runs in development and production.
The server applies pending
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

The component library covers these reusable UI areas:

- **Journal:** bean/café cards, collection cards/tables, toolbar, view switcher,
  pagination and metrics.
- **Forms:** inputs, validation, dates, suggestions, creatable pickers,
  sections/actions, tasting, roaster and gear fields.
- **Brewing:** espresso/filter parameters, extraction balance, sensory ratings,
  flavor tags, drink choices, timer, history charts and recommendation blocks.
- **Stats:** activity chart/calendar and brewing averages.
- **Feedback and layout:** page headers/layouts, loading, empty, missing entity,
  route errors, error details and help.
- **Media and maps:** image fallback, local picture intake, map status and
  saved/favorite/wishlist place cards.
- **UI primitives:** buttons, badges, cards, stars, checkbox, switch, toggle,
  textarea, progress, calendar, tabs, dialog, sheet, popover, tooltip, dropdown,
  command search, table, scroll area, collapsible and input groups.

Variants include populated, empty, invalid, disabled, loading, selected and
read-only states where applicable. Each story file has an automatic documentation
page. Complex fixture objects are supplied by stories; interactive controls and
Actions expose the useful behavior.

Service-connected containers remain application integration coverage: saving
entity forms, image persistence/gallery operations, AI requests and chat,
command entity search, live map tiles/geocoding, settings persistence, and
offline synchronization. Stories exercise their reusable presentation components
without contacting those services. The picture uploader previews local files in
memory and deliberately returns an error for URL imports.

Standalone stories fit their content. Keep page-height and map-positioning
adjustments inside story wrappers; retain fixed dimensions when they demonstrate
an image, chart, or scrolling behavior.

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

The strict runner executes each integration suite in a separate process so
cached authentication and provider configuration cannot leak between suites.
It fixes image limits at three pictures per item and 1 MiB per journal so storage
limit tests run independently of the installation's configuration.
Always use isolated test services. CI provisions PostgreSQL and MinIO, applies
the complete migration chain, and then runs all tests.

The authentication contract in `scripts/auth-contract.ts` runs unchanged against
PostgreSQL through `contract.integration.test.ts` and against D1 through
`bun run test:cloudflare`. It exercises real Better Auth HTTP handlers, OTP
expiry and reuse, signed OAuth continuation without a referrer, session-cookie
renewal and revocation, administrator authorization, and confirmed account
deletion. PostgreSQL delivery uses a local SMTP sink; D1 uses a test email service
binding. Neither suite sends external email.

GitHub Actions workflows with `@orcastrate` frontmatter are managed by
[`michidk/workflows`](https://github.com/michidk/workflows). Change the canonical
template alongside the rendered workflow so the next sync preserves the change.
Renovate inherits that repository's preset from `.github/renovate.json5`, with
local rules for the tested TypeScript version and coordinated Better Auth updates.

CI checks both database schemas against their committed migration snapshots,
including newly generated files. It builds the browser-local demo separately
and runs D1 ownership, concurrency, account-job, and OAuth tests inside workerd.
Hosted and demo browser bundles use the same server-code and asset-size checks
as the self-hosted build. Workflow validation runs actionlint with shell checks;
the shared PR-title workflow checks Conventional Commit titles.

To inspect a different build's client assets, pass its public directory:

```bash
bun run check:client-assets .output/cloudflare/public
bun run check:client-assets .vercel/output/static
```

## Maintenance scripts

- AI pricing is generated at build time from the packaged models.dev catalog
  (`scripts/ai-pricing.ts`), so deployments do not depend on a live pricing
  request. Vite and Bun (through `bunfig.toml` preload) both provide it as
  `virtual:roastbook/ai-model-pricing`. Updating `@opencode-ai/models` refreshes
  rates. A supported model missing from that catalog fails the build unless
  `scripts/ai-pricing.fallbacks.json` has a reviewed rate for it.
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
boot. Journal edits and pictures commit to RxDB with their durable
synchronization commands; see
[Offline journaling](offline.md).

`bun run check:pwa` validates the manifest, icons, offline page, and built
service worker after a build. The demo disables PWA installation and server
synchronization. Its editable journal and pictures persist in isolated browser
storage. Run `bun run dev:demo`
to prepare its sample JSON, or `bun run build:demo` for production.
Shared journal behavioral tests cover local persistence, relations,
reset, visitor isolation, and integration rejection. See
[Browser-local demo](demo-mode.md). Validate its PWA restrictions with
`bun run scripts/check-pwa.ts --demo .vercel/output/static`.
The worker's runtime behavior
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

## Shared client journal

See [Client journal architecture](client-data.md) for package boundaries and
[Offline journaling](offline.md) for actual coverage. Ordinary client operations
use `src/lib/client/journal`; portable commands and reads live in
`src/modules/journal`. Never import server implementations into shared packages.

After a PostgreSQL schema change, regenerate portable model metadata with
`bun run generate:journal-model`. `bun run check:boundaries` verifies generated
models, synchronization revision triggers, and import ownership. New journal
tables must participate in owner revision tracking on both PostgreSQL and D1.
The schema has its normal committed server migrations; browser format versions
are independent and unsupported versions must preserve saved data.

Run standard, demo, and hosted builds sequentially in a checkout because Nitro
build state is shared. The standard build runs Vite under Bun so SPA-shell
prerendering uses the Bun runtime selected by the Nitro preset. Product builds
must emit `offline-shell.html`; service-worker generation fails if it is missing.
Demo builds emit no SQL engine, install manifest, or product offline shell.
