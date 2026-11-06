# Browser-local demo

The demo edition is an editable journal seeded with fictional sample data. Every
journal record and setting can be created, edited, and deleted.

## Local data

The demo runs the product's SQL journal functions on the visitor's own PGlite
database in a browser worker (see [Journal architecture](client-data.md)). The
edition (`packages/journal-demo/src/edition.ts`) seeds the journal from
fixtures, allocates identifiers locally, and never syncs. Its bean-package and
gear pictures come from `scripts/seed-assets/` (gear images are named after the
slugged gear name) and are emitted as static files by the demo build.

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

Uploads use the normal image pipeline in the browser (WebP at 2048, 800 and
256 pixels), three pictures per item, up to 10 MiB per file and
50 MiB in total (browser quota may be lower). Picture bytes are stored in the
demo database and removed with their record or on reset.

## Restrictions

AI recommendations, their suggested follow-up questions, and bean research use
preset responses generated from the original sample journal. They never
contact an AI provider. Each preset recommendation, follow-up answer, and bean
research response waits a random 1.5–3.5 seconds to simulate a request. The
thinking animation is shared with the standard application, which waits only
for its real AI provider. `generate-demo-snapshot.ts` writes
`/demo-local/ai.json` alongside the journal, so rebuilding refreshes both from
the same fixtures. Recommendations cover each sample brew and its matching
equipment history: they suggest returning to the grind setting of a higher-rated
matching brew when one exists, and otherwise repeating the brew. Beans without
brew history have preset research and guidance to record a first brew. New
beans, new brews, and unsupported methods report that no preset exists. Edits do
not change the presets; custom chat questions explain this limitation. Image
extraction, gear and roaster research remain unavailable.

Remote image import, geocoding, map tiles, MCP/OAuth, email, authentication,
administration, external devices, remote storage, and sync are unavailable;
enter cafés and coordinates manually. The demo build replaces integration
server functions with local preset handlers or stubs that fail before any
network access (`scripts/vite-demo-services.ts`). The deployed demo has no
application server or API endpoints. Visitor edits never leave the browser.

The demo is not installable and has no offline shell. Its service worker only
removes earlier Roastbook workers and caches.

## Build and deploy

The edition is fixed at build time with `ROASTBOOK_EDITION=demo` and needs no
database, storage, or credentials.

```bash
bun run dev:demo
bun run build:demo
bun run check:client-assets dist/client
```

`dev:demo` regenerates the sample JSON before starting Vite; restart it after
changing fixtures or migrations. `build:demo` writes the complete static site to
`dist/client/`. Publish only that directory. The server bundle used to render
the initial HTML during the build is not part of the deployment.

Use HTTPS, serve JavaScript and WASM with their correct content types, and return
`index.html` for application navigation paths such as `/overview`. Missing asset
requests must return 404. Revalidate HTML, `/demo-local/**`, and `/sw.js` on each
visit; hashed `/assets/**` files may be cached indefinitely. Every preview needs
its own hostname to isolate browser data, and a stable hostname preserves that
data between updates.

The **Static demo build** workflow builds main and pull requests and publishes a
`demo-static` artifact. Branches without a PR do not create previews. An optional
publisher receives metadata notifications through `DEMO_PUBLISHER_REPOSITORY`,
using the existing Releaser App. The notification workflow never checks out PR
code. Build jobs have no publishing credentials. A publisher must independently
verify the current PR, successful build, and authorization before using artifacts.
Fork previews require the repository owner's `preview` label; removing it or
closing the PR revokes the preview. Same-repository PRs are automatic.

Do not run a Vite dev server and a production build at the same time in one
checkout; they share generated build state.
