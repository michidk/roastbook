# Offline journaling

The installed app keeps the signed-in account's journal on the device and works
offline. A browser tab uses the server and downloads nothing, unless **Settings
→ Offline → Keep this journal on this device** is on. A device copy downloads
the journal records once (pictures load as they are shown), reads and writes
locally, and syncs with the account when a connection is available. See
[Journal architecture](client-data.md) for the design.

## What works offline

With a device copy, the whole journal works offline: brews, recipes, beans and
bags, gear, roasters, cafés and visits, brewing methods, drinks, taste tags,
settings, and pictures, including lists, search, filters, overview, and
statistics.

AI, web research, geocoding, remote image import, the shottimer, administration,
email, and sign-in need the server. Pictures from other devices are available
offline once this browser has shown them.

The first download needs an online, signed-in session; stay online until it
finishes. New records use identifiers the server reserved for this device; if a
long offline period uses them up, creating records pauses until you reconnect.

## Sync and conflicts

Each change is saved locally with its sync record in one transaction and sent
after the change, at startup, on reconnect or focus, every 30 seconds, and from
**Sync now**. The server applies each change exactly once. Changes from other
devices download when the account's journal changed, only the records that
changed.

A change that no longer fits the latest journal, such as an edit to a record
deleted elsewhere, appears in the sync banner as needing review: **Try again**
resends it, **Discard** restores the account's version. Other changes keep
syncing. Signing out requires everything to be synced.

**Settings → Offline** shows sync state, the last sync, and storage use.
Turning the device copy off deletes it once synced, and sign-out removes it.
**Repair app shell** refreshes application files without touching the journal.

## Storage and privacy

The service worker caches a data-free shell (`/offline-shell.html`) and the
application assets, and the database engine once a device copy uses it; no
authenticated HTML is cached.
Local data is not encrypted and belongs to one browser profile and origin.
Clearing site storage loses unsynced changes. A current browser over HTTPS or
localhost with IndexedDB and Web Locks is required.

## Testing

`bun run test:browser-runtime` runs journal functions on PGlite.
`src/lib/server/journal-sync.integration.test.ts` replays writes on PostgreSQL.
