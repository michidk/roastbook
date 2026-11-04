# Offline journaling

The standard product keeps the signed-in account's journal in the browser, in a
normal tab and in the installed PWA. After the first online download, every
journal page reads and writes this local copy, online or offline, and changes
sync with the account when a connection is available. The [demo](demo-mode.md)
runs the same journal with fictional data and no synchronization.

## Coverage

Everything in the journal works offline: brews, recipes, beans and bags, gear
and gear sets, roasters, cafés and visits, brewing methods, drinks and options,
taste tags, journal and appearance settings, and pictures. Lists, details,
search, filters, counts, overview and statistics run the same SQL as the server
against the local copy, so records need not have been visited first.

AI features, web research, geocoding, remote image import, the shottimer,
account administration, email and sign-in need their server services and are
unavailable offline. Pictures added on this device stay available offline.
Pictures added on other devices display from the server, so an uncached one can
be missing offline.

The first download needs an online, signed-in session. A failure shows an error;
it never treats a missing journal as an empty one. New records use identifiers
the server reserved for this device; if a long offline period uses them all, new
records stop with a message to reconnect, and saved changes are kept.

## Synchronization and recovery

A change is saved with its sync record in one local transaction, then sent when
a connection is available: after each change, at startup, after reconnecting,
when the app regains focus, every 30 seconds, and from Sync now. The server
validates and applies each change exactly once inside the normal journal
boundary. Changes from other devices or integrations download when the account's
journal revision changed.

A change made against an older journal still applies when it fits the latest
one. A change that no longer fits, such as an edit to a record deleted on
another device, is listed as needing review in the sync banner. Try again sends
it again; Discard drops this browser's version and restores the account's
journal. Other changes keep syncing. Signing out requires that everything has
synced.

Changes queued by earlier versions of the offline mode move into the journal
automatically on first open. If any cannot move, Settings → Offline says how
many, and the earlier browser storage is kept.

Settings → Offline shows the sync state, the last sync, and browser storage use.
Remove local copy deletes this browser's journal when everything has synced; it
downloads again on the next visit. Repair app shell refreshes application files
without touching the journal.

## Offline startup and privacy

The product build prerenders a public, data-free SPA shell at
`/offline-shell.html`. The service worker caches it, the hashed application
assets and the journal database engine for cold offline starts. No
authenticated HTML enters the document cache. Stay online until the first visit
finishes downloading before relying on offline use.

Browser storage belongs to one browser profile and origin. Roastbook does not
encrypt it, and the browser or the user can remove it; clearing site storage
removes changes that have not synced yet. The local journal needs IndexedDB and
Web Locks, so it requires HTTPS (or localhost) and a current browser.

See [Journal architecture](client-data.md) for the design.

## Verification

`bun run test:browser-runtime` runs journal functions with the browser platform
against PGlite. `src/lib/server/journal-sync.integration.test.ts` and
`bun run test:cloudflare` replay recorded writes on PostgreSQL and D1.
Service-worker tests cover shell fallback, private-document exclusions and
engine precaching.

For a browser acceptance pass, download a journal, go offline, create related
records and a picture, reload, reconnect, and confirm one server copy with the
same identifiers. Also check a cold offline start, two tabs, a change made on
another device, and a conflict.
