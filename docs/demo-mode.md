# Browser-local demo

The demo edition is an editable journal seeded with fictional sample data. Every
journal record and setting can be created, edited, and deleted.

## Local data

The demo runs the product's SQL journal functions on the visitor's own PGlite
database in a browser worker (see [Journal architecture](client-data.md)). The
edition (`packages/journal-demo/src/edition.ts`) seeds the journal from
fixtures, allocates identifiers locally, and never syncs.

- The first visit downloads `/demo-local/journal.json` (plus the database
  engine, about 5 MB compressed) into the empty `roastbook-demo` database.
  Existing data is never reseeded; newer demo builds migrate it in place.
- Data stays in this browser profile on the demo origin. It survives reloads
  but never syncs, and disappears when site storage is cleared or evicted.
- Tabs share one database through a leader worker. A failed write rolls back
  and keeps earlier changes.
- **Reset demo** (after confirmation) restores the fixtures and removes added
  pictures and demo appearance preferences.
- It needs a current browser over HTTPS or localhost with IndexedDB and Web
  Locks.

The avatar menu offers Settings and a theme choice only. `AUTH_ENABLED=false` in
the standard edition selects a shared server journal; it never enables the demo.

## Pictures

Uploads use the normal image pipeline in the browser: WebP versions bounded to
1600, 640, and 128 pixels, three pictures per item, up to 10 MiB per file and
50 MiB in total (browser quota may be lower). Picture bytes are stored in the
demo database and removed with their record or on reset.

## Restrictions

AI, web research, remote image import, geocoding, map tiles, MCP/OAuth, email,
authentication, administration, external devices, remote storage, and sync are
unavailable; enter cafés and coordinates manually. The demo build replaces
integration server functions with stubs that fail before any network access
(`scripts/vite-demo-services.ts`). The server has no journal database: API and
server-function requests are rejected except the health check, so visitor edits
never reach the backend.

The demo is not installable and has no offline shell. Its service worker only
removes earlier Roastbook workers and caches.

## Build and deploy

The edition is fixed at build time with `ROASTBOOK_EDITION=demo` and needs no
database, storage, or credentials.

```bash
bun run dev:demo
bun run build:demo
bun run check:client-assets .vercel/output/static
```

`dev:demo` regenerates the sample JSON before starting Vite; restart it after
changing fixtures or migrations. `build:demo` writes `.vercel/output`; deploy it
with `vercel deploy --prebuilt` (`vercel.json` uses `build:demo` for Git
deployments). Do not run a Vite dev server and a production build at the same
time in one checkout; they share Nitro build state.
