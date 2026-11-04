# Offline journaling

The standard product uses one account-scoped browser journal in a normal tab and
an installed PWA. After the first complete online download, journal reads and
ordinary edits use local IndexedDB data. Changes survive reloads and wait for
server confirmation. The [demo](demo-mode.md) uses the same journal implementation
with fictional data and no synchronization or installation support.

## Coverage

Local operations cover brews, recipes, beans and bags, gear and gear sets,
roasters, cafés and visits, brewing methods, drinks and options, taste tags,
journal settings, appearance settings, and added pictures. Lists, details,
relationships, filters, search, counts, overview, and statistics derive from the
same committed local data. Records need not have been individually visited first.

AI, web research, geocoding, remote image import, external devices, account
administration, email, and authentication require their normal server services.
Existing remote pictures are not downloaded into IndexedDB automatically. Pictures
added on this device stay available locally after synchronization while referenced
by the journal. An uncached remote picture can be unavailable offline.

The first complete journal download requires an online authorized session. A
failure shows an error and preserves saved work. It never pretends that a partial
or missing journal is an empty one. New numeric records consume reserved IDs;
reconnect if the saved per-table identifier pool runs out.

## Synchronization and recovery

A local commit saves the domain changes, picture bytes, and durable command
together. The pending banner distinguishes device storage from server
confirmation. Synchronization runs at startup, after reconnecting, and on manual
retry. The server validates commands independently and applies them inside the
existing authenticated journal boundary.

Commands carry UUID idempotency keys and a base journal revision. Lost responses
retry one logical write. Another device or integration changing the journal can
cause a conflict. Your local journal stays intact until you choose a recovery
action. Review changes lets you download a local copy, retry, explicitly apply
your edits to the latest server revision, or discard pending edits and use the
server journal. Signing out requires resolving pending work first.

Earlier versions' pending brew/recipe operations and caches remain available.
Resolve or sync that work in Pending changes before making new journal edits.
The old queue drains through its original idempotent endpoints; new forms use
only the shared journal command path. If the first complete download is
unavailable, the pending page and Settings → Offline remain accessible for
recovery.

Settings → Offline reports local pending counts and estimated browser storage.
The shared-journal banner opens its recovery actions. Clearing earlier caches
preserves the new journal and pending work. Clearing all local data requires a
connection and no pending shared-journal commands; the next online visit downloads
the journal again. Repair app shell refreshes application files without deleting
journal data.

## Offline startup and privacy

The product build prerenders a public, data-free SPA shell at
`/offline-shell.html`. The service worker caches it and hashed application assets
for cold offline navigation. Client loaders open the previously selected account's
local journal. No authenticated journal HTML enters the document cache. First
load, asset download failure, browser cache eviction, or unsupported service
workers can prevent cold startup. Keep an online visit long enough for downloads
to finish before relying on offline use.

Browser storage is specific to a profile and origin. It is not encrypted by
Roastbook and can be removed by the user, browser eviction, or private browsing.
Clearing site storage removes unconfirmed edits and pictures. Download a local
copy before destructive conflict recovery. An unsupported saved format reports
an error without silently resetting it; use a compatible application version or
contact support.

The journal currently stores an aggregate document and recomputes reads when its
revision changes. Large journals and many local images increase memory use and
write cost. See [Client journal architecture](client-data.md) for the package,
transaction, synchronization, and identifier contracts.

## Verification

`packages/journal-client/src/journal.test.ts` exercises actual RxDB/Dexie storage
with fake IndexedDB. Shared command tests cover relationships, derived results,
images, and settings. PostgreSQL integration tests compare local results to SQL
and verify replay, ownership, stale revisions, and rollback. Hosted verification
runs the same transport against D1. Service-worker tests exercise shell fallback,
private-document exclusions, application assets, and recovery.

For a browser acceptance pass, download a journal, go offline, create and edit
related entities and a picture, reload, reconnect, and confirm exactly one server
result. Also test cold startup, two tabs, account switching, expired sessions,
quota errors, and conflict recovery. Automated storage tests do not substitute
for these browser checks.
