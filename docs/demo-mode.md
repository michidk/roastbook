# Browser-local demo

The demo edition is an editable journal seeded with fictional sample data. You
can create, edit, and delete brews, beans and purchases, recipes, gear and gear
sets, roasters, cafés, and café visits. Journal settings, brewing methods,
drinks, taste tags, palettes, coffee stains, and grain are editable too.

Changes and added pictures stay in the current browser profile on the demo's
origin. They survive navigation, reloads, and later visits. They never sync to
another browser or device and disappear if site storage is cleared or evicted.
Private browsing may remove them when its session ends. The persistent demo
notice calls this temporary, unbacked-up data and links to
[Sign up for Roastbook](https://app.roastbook.coffee) for the full experience
and an account that keeps the journal beyond this browser. Its **Reset demo**
action asks for confirmation, then restores the fictional journal and removes added
demo pictures. It does not clear standard-edition journal or account storage.

The avatar menu shows "demo user", Settings, and a Theme submenu with System,
Light, and Dark. There are no account, administrator, or sign-out actions.
`AUTH_ENABLED=false` in the standard edition still selects a writable shared
server journal. It never enables this demo.

## Local data boundary

A dedicated worker runs PGlite in memory. The demo build compiles an explicit
allowlist of the existing journal server-function validators and domain queries
into that worker. Database, identity, mutation, media, and integration adapters
replace their server dependencies. Image validation, scoped record queries, and
thumbnail mutations share the same helpers as the server edition. PostgreSQL and
PGlite also share identifier allocation and mutation assertions, with each
adapter retaining its own transaction and identity boundary.

Lists, details, relationships, pagination,
filters, command search, overview, and statistics all query this same local
database. The existing RxDB caches and synchronization queues are not the demo's
data source and do not run in this edition.

On first use, the worker restores the build-generated snapshot made from the
committed PostgreSQL migrations and deterministic seed fixtures. It commits a
compressed database snapshot and local picture blobs together in IndexedDB,
under `roastbook-browser-demo`. Existing records are never automatically
reseeded. Each operation acquires an origin-wide Web Lock, checks the saved
revision, and reloads changes made by another tab before continuing.
BroadcastChannel refreshes open tabs after commits. Color-mode preferences use
`roastbook-demo-preferences`, separate from the standard preference key.

Committed schema migrations upgrade saved journals transactionally. The record
also has a storage-format version. A newer, unsupported, corrupt, or failed
upgrade does not replace the saved record. Failed writes, including quota
failures, discard the attempted in-memory change and retain the last committed
snapshot. The UI reports the error and offers retry; confirmed reset is also
available from the error page. Reset intentionally replaces the demo data.

Use a current browser over HTTPS or localhost with IndexedDB, Web Locks,
BroadcastChannel, WebAssembly, and worker support. Image processing also needs
createImageBitmap and OffscreenCanvas. Browser storage must be enabled and have
space for the database and pictures. The initial visit downloads the database
engine and sample snapshot, so it can take longer than subsequent navigation.
The demo is intended for exploration, not durable backups or large journals;
each successful mutation saves a full compressed database snapshot.

## Pictures and integrations

Local file selection uses the normal image intake and compression controls.
The worker validates the file and parent record, decodes the image, and creates
WebP versions bounded to 1600, 640, and 128 pixels. The demo permits three
pictures per item, up to 10 MiB per input file and 50 MiB of compressed browser
pictures including thumbnails. Browser quota may impose a lower limit.
Browser blob URLs display added images; they survive reload through IndexedDB.
Deleting a record or picture also removes its local image files. Reset removes
all added images. Bundled fictional package images and abstract favicons are
static same-origin assets.

AI, web research, remote image import, geocoding, map tiles, MCP/OAuth, email,
authentication, account administration, external devices, remote media storage,
and synchronization are unavailable. Enter cafés and coordinates manually.
Integration settings explain the restriction. The worker rejects operations
outside its journal allowlist, and disabled integration adapters fail before
network access. No changes are queued for eventual server synchronization.

The demo backend has no journal database. Its database accessor throws, all
mutation requests remain forbidden, and API and server-function requests are
blocked except the database-free health check. Demo API routes compile to
forbidden handlers. Hidden controls are not the enforcement boundary. Visitor
edits never reach shared backend storage.

## Development and deployment

The edition is compiled into both client and server bundles with
`ROASTBOOK_EDITION=demo`; it cannot be changed at runtime. Neither a database
connection nor storage or integration credentials are needed.

```bash
bun run dev:demo
bun run build:demo
bun run check:client-assets .vercel/output/static
```

The development command prepares the snapshot and worker before starting Vite.
Restart it after changing worker domain code or migrations. The production
command emits `.vercel/output`, including `/demo-local/*` worker, database-engine,
snapshot, and migration assets, and `/media/*` fictional images. The client
asset check scans both application and worker JavaScript for forbidden server
markers and size budgets. The worker build rejects unapproved server modules
and integration dependencies. `scripts/demo-local.test.ts` runs the compiled
worker's real PGlite domain behavior with isolated IndexedDB factories.

Deploy the prebuilt output with `vercel deploy --prebuilt`. `vercel.json`
selects `build:demo` for Git-connected deployments. Standard `bun run build`,
Docker, and Workers builds keep their existing server database and storage
behavior. Do not run a Vite development server and production build concurrently
in the same checkout because their Nitro build state is shared.

## Installation and offline behavior

The demo has no install manifest, offline page, service-worker shell cache, or
replication. It can save edits locally while its loaded tab remains open without
a network connection, but a cold offline launch is not supported. The install
hint describes the standard edition's offline support.

A retiring service worker replaces workers published by older demo builds. It
removes Roastbook shell caches and unregisters itself without handling network
requests or deleting journal data. The runtime also unregisters old Roastbook
workers when visiting the demo online.

## Brewing and drink defaults

The sample journal uses Espresso, Pour over, AeroPress, French press, and Moka
pot with method-specific fields. Pour over is a brewing method; its finished
drink is Filter. Fixtures use the same defaults as a new standard installation.
Cold brew and Other remain available for additional workflows.
