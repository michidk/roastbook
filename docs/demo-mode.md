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

The demo runs the product's journal: the same SQL journal functions, on the
visitor's own PGlite database in a browser worker. Only the edition differs
(`packages/journal-demo/src/edition.ts`): the journal is seeded from fixtures,
never syncs, and allocates identifiers locally. Lists, details, relations,
pagination, search, filters, overview, statistics and counts all read that
database. See [Journal architecture](client-data.md).

The first visit downloads `/demo-local/journal.json` and loads it only when the
`roastbook-demo` database has no journal yet; existing changes are never
reseeded. Tabs share one database through a leader worker. Color-mode
preferences use `roastbook-demo-preferences`, separate from standard ones.

The database applies the server's migrations, so a newer demo upgrades saved
data in place instead of replacing it. A failed write, including a full browser
storage, rolls back and keeps earlier changes. Confirmed Reset demo restores the
fixtures, removes added pictures and resets demo appearance preferences. It
never touches product account storage.

Use a current browser over HTTPS or localhost with IndexedDB, Web Locks and
image decoding. The first visit downloads the database engine (about 5 MB
compressed). The demo is temporary, unbacked-up exploration data.

## Pictures and integrations

Local file selection uses the normal image intake and compression controls.
The browser validates the file and parent record, decodes the image, and creates
WebP versions bounded to 1600, 640, and 128 pixels. The demo permits three
pictures per item, up to 10 MiB per input file and 50 MiB of compressed browser
pictures including thumbnails. Browser quota may impose a lower limit.
Picture bytes are stored in the demo database with their records and display
through blob URLs. Deleting a record or picture also removes its files. Reset removes
all added images. Bundled fictional package images and abstract favicons are
static same-origin assets.

AI, web research, remote image import, geocoding, map tiles, MCP/OAuth, email,
authentication, account administration, external devices, remote media storage,
and synchronization are unavailable. Enter cafés and coordinates manually.
Integration settings explain the restriction. In the demo build every
integration server function is replaced by a stub that fails before network
access. Nothing is queued for server synchronization.

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
including `/demo-local/journal.json` and `/media/*` fictional images. The demo build
replaces server-function modules with generated exports that reject integration
calls (`scripts/vite-demo-services.ts`); a few aliases cover HTTP handlers and
the auth client. The asset check allows the database engine only in the journal
worker and secrets nowhere. `scripts/demo-local.test.ts` checks the generated
fixtures, and `bun run test:browser-runtime` runs journal functions on PGlite
like the demo does.

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
