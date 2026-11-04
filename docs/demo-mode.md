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

The demo selects the shared RxDB journal from `packages/journal-client` and
portable commands/read models from `src/modules/journal`. TanStack DB subscribes
to committed journal revisions. No SQL engine, Drizzle driver, server domain
implementation, or synchronization transport runs in the browser. PGlite is a
development dependency used only to generate fixtures from committed migrations.

Lists, details, relations, pagination, search, filters, overview, statistics, and
counts all read the same local journal. The product and installed product PWA
use these operations too, with an authenticated synchronization adapter.
See [Client journal architecture](client-data.md).

The first visit downloads `/demo-local/journal.json` and inserts it only if no
journal exists. RxDB stores journal tables, local image bytes, and settings in one
atomic document in the isolated `roastbook-demo-journal` database. Another tab
seeding first wins; existing changes are never automatically reseeded. RxDB
propagates committed document changes between tabs. Color-mode preferences use
`roastbook-demo-preferences`, separate from standard preferences.

The record has an explicit format version. Unsupported or invalid data fails
without overwriting the saved record. A failed write, including browser quota
failure, preserves the previous commit. Confirmed Reset demo restores fixtures,
removes added images, and resets demo appearance preferences. It never clears
product account storage.

Use a current browser over HTTPS or localhost with IndexedDB and browser image
decoding/canvas support. Browser storage must be enabled and have free space.
The journal currently saves an aggregate document and recomputes derived reads
after changes. Large journals and many pictures increase memory and write cost.
The demo is temporary, unbacked-up exploration data.

## Pictures and integrations

Local file selection uses the normal image intake and compression controls.
The browser validates the file and parent record, decodes the image, and creates
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
Integration settings explain the restriction. Shared commands reject operations
outside its journal allowlist, and explicit unavailable-service modules fail before
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

The development command prepares the sample JSON before starting Vite. Restart
after changing fixture generation or migrations. Production emits `.vercel/output`,
including `/demo-local/journal.json` and `/media/*` fictional images. Demo service
aliases select explicit modules that reject integration calls. The asset and
module checks reject browser server code and SQL engines, and product builds
reject demo modules and fixtures. `scripts/demo-local.test.ts` exercises generated
fixtures through shared journal commands without a runtime SQL engine.

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
