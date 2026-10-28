# Offline journaling

Roastbook can journal brews and recipes while the browser is offline. The app
shell, reference data, and visited detail routes are cached after an online
visit. Pending work lives in IndexedDB and syncs when connectivity returns.

## What works offline

- Creating, editing, and deleting brews.
- Creating, editing, and deleting recipes, including saving a brew into a
  recipe.
- Attaching and removing brew pictures.
- Logging a brew with the new-brew form, including the tasting step.
- Reopening brew, recipe, bean, or gear detail pages that were viewed online,
  with a saved-copy notice.
- Reviewing pending changes and resolving edits that conflict with server data.
- Viewing Settings → Offline for pending counts, the last successful sync,
  browser storage usage, re-sync, and local-data clearing.
- Pending work survives reloads and app restarts.
- Pending work is labeled on the pending page and in the app banner.
- Sync runs when the app opens, when connectivity returns, and from the manual
  retry action.

## What stays online-only

- Editing or deleting beans, gear, roasters, cafés, and visits.
- AI label scanning, research, and recommendations.
- The shottimer integration.
- Server-backed settings controls; the browser theme remains editable.

Those actions are disabled or show an error while offline. Brew and recipe
journaling, pictures, and sync-later behavior work without a connection.

## Sync behavior

- Each queued brew and recipe create has a client operation ID.
- `brews.client_operation_id` and `recipes.client_operation_id` have unique
  indexes. Repeating a create with the same ID returns the existing row instead
  of inserting another one.
- A queued item is marked acknowledged only after a successful server response.
  If the app closes after the server commits but before the response arrives,
  the next retry returns the same row and acknowledges the operation.
- Edits carry the entity's `updatedAt` as a base revision. If the server row
  changed in the meantime, the operation becomes `conflict` and the pending
  page offers **Keep local** or **Accept server**.
- Deletes are idempotent; a retry after a lost delete response succeeds when
  the row is already gone.
- The sync runner claims one runnable operation at a time as `in-flight`. An
  operation runs only after all of its dependency IDs are acknowledged.
- Picture uploads store the file in the local blob store until the server
  acknowledges it. Removing a picture is queued separately, and the cached
  detail is refreshed after either operation syncs.
- A sync flush is single-flight within a tab and serialized across tabs with
  the Web Locks API. Browsers without Web Locks fall back to the in-tab guard.
- Operations left `in-flight` by a closed tab become `retryable` on the next
  flush instead of staying stuck.
- If authentication expires, the queue is kept and marked “sign in to sync.”
  After signing in, sync resumes.
- If the server rejects a queued operation (for example, its bean was deleted),
  the item stays on the device with the error and Retry/Discard actions.

## Storage architecture

The offline write path uses a generic operation log rather than a queue per
feature. A stored operation has:

- an operation ID and deterministic idempotency key;
- an owner key, entity type, operation type, local entity ID, and optional
  server ID;
- the full payload and presentation details needed to retry without reading a
  mutable UI snapshot;
- dependency IDs for operations that must wait for another entity to exist;
- created and updated timestamps, attempt count, next retry time, last error,
  base revision, blob references, and an explicit status.

Statuses are `pending`, `in-flight`, `retryable`, `permanent`,
`auth-required`, `conflict`, `cancelled`, and `acknowledged`. Acknowledged and
cancelled records remain in IndexedDB as local audit or tombstone records but
are hidden from the pending UI. The operation log is owner-scoped. The current
single-user Hodor deployment uses the `local` owner key; the same field is the
seam for per-user scoping if the authentication boundary later exposes an
identity.

Pending brew and recipe creates, brew/recipe edits and deletes, image
operations, and save-to-recipe operations are stored in this log. Existing
version-1 `pending-brews` records migrate to `operations` when the database
upgrades.

The local data layer provides an owner-scoped store for brews, recipes, beans,
gear, drinks, and tags, with a schema version, local and server IDs, revision,
sync state, and deletion tombstones. A separate sync-metadata record stores the
last successful sync time. A queued brew also creates a local entity record;
the sync runner marks it synced with the server ID returned by the create. Brew,
recipe, bean, and gear detail pages cache their loaded data and look it up by
server ID. A separate owner-scoped blob store holds queued picture files until
the server acknowledges the upload.

## Settings and local data

Settings pages show an offline banner and make server-backed controls read-only
while offline. The browser theme preference and the Offline settings page stay
available; the server-backed page background control is disabled.

Settings → Offline shows waiting, attention, and auth-required operation counts,
the last successful sync, and browser storage usage. It offers a re-sync action,
a cached-data clear that preserves pending operations, and a full local-data
clear. The full clear warns explicitly when unsynced operations would be
discarded. Server-backed controls are disabled while offline; if a mutation
still reaches the server and fails, the optimistic value rolls back.

Server-backed settings loaders cache their last successful response. Drinks,
taste tags, AI usage, shottimer status, and storage statistics therefore render
read-only from the local cache when offline instead of showing a loader error.

AI research and image extraction actions check connectivity before calling the
server, and shottimer enable/token actions do the same. The new-brew form
already hides the shottimer integration and AI recommendation action offline.

## Planned offline coverage

Brew and recipe create/edit/delete, brew pictures, save-to-recipe, and conflict
resolution are now queued. The same operation log can be extended to beans,
gear, roasters, cafés, and visits later. AI, shottimer, server-backed settings,
and account actions remain online-only.

## PWA recovery

- The worker validates asset content types before caching. An HTML login or
  error page served under a script, stylesheet, or font URL is not cached, and
  a corrupt cached entry is removed and refetched.
- Client assets above 2 MiB are not precached or added to the runtime cache.
  `bun run check:pwa` enforces the same limit against the build output.
- Settings → Offline → Repair app shell clears the worker's shell caches and
  unregisters it without touching IndexedDB. The page reloads and re-registers
  the worker online, preserving pending operations.
- API routes, server functions, auth gate paths, media, and writes stay outside
  the worker cache.

## Storage and privacy

- Pending operations, cached local data, picture blobs, and reference data live
  in IndexedDB in this browser. They are per-device and are not encrypted by
  Roastbook.
- The service worker caches app HTML for offline boot. Cached documents are
  versioned by build, bounded, and cleared on logout.
- Clearing site data removes pending work and queued pictures. Discarding a
  pending operation is permanent from the UI and leaves a cancelled tombstone.
- Queued creates are independent across devices. Edits carry a base revision,
  so a concurrent server change is surfaced as a conflict instead of being
  silently overwritten.
- IndexedDB migrations are forward-only. After a newer build has upgraded the
  local schema, rolling back to an older build can fail with `VersionError`.
  Recover by clearing site data for the origin, which also removes pending
  local work.

## Offline readiness

- After an online app load, the app idle-prefetches the new-brew route and its
  reference data, then saves the data in IndexedDB.
- When `/brews/new` is opened through client-side navigation while offline, its
  loader falls back to the saved data and shows an offline notice.
- Brew, recipe, bean, and gear detail loaders save their loaded data after an
  online visit. If a detail loader fails while offline, it returns the saved
  copy and shows the saved-copy notice.
- The service worker's document cache lets the installed app reopen offline.
  Routes that were never visited online may still show the offline page.
- The new-brew form queues brews and save-to-recipe operations; the recipe
  create/edit forms and brew detail edit/delete actions queue changes too. The
  tasting dialog updates the queued payload in place.
- Brew picture uploads keep a local blob until the server acknowledges them.
  Picture removals are queued as operations without a local blob.

## Verification

- Unit tests: `src/modules/offline/*.test.ts` and
  `scripts/service-worker.test.ts`. The operation-log tests cover state
  transitions, dependency ordering and execution, acknowledgement and
  cancellation, interrupted-flush recovery, legacy queue migration, local
  entity persistence and edit merging, brew/recipe/bean/gear detail caching,
  picture blob limits, conflict status, sync metadata, cache clearing, database
  deletion, and cross-tab lock fallback. The worker tests cover precache, asset
  validation and repair, size limits, and shell reset.
- `bun run test:integration` covers the duplicate-operation-ID contract and
  server-side edit/delete revision checks.
- Manual check: create, edit, delete, and attach a picture to a brew offline;
  reload or close and reopen the app, reconnect, and confirm exactly one server
  record with the expected values. Also exercise an interrupted sync, a
  conflict, and an expired session.

## RxDB replication slice

The first RxDB vertical slice synchronizes the recipe projection through a
browser-only RxDB database backed by the open-source Dexie storage adapter.
`@tanstack/rxdb-db-collection` mirrors that collection into TanStack DB for
reactive client queries, while RxDB owns durable writes, replication metadata,
retry, and multi-tab leadership.

The replication endpoints are `/api/replication/pull` and
`/api/replication/push`. Pull uses a monotonic PostgreSQL sequence checkpoint;
push uses the recipe revision as the assumed master state and returns the
current server document when a concurrent edit conflicts. Recipe writes made
through the existing server functions append to the same change log in their
transaction, so a second device can receive them without a separate worker.

The existing operation log remains authoritative for the current brew and
recipe offline forms while this slice is validated. Future entity migrations
must choose one local write path per entity before removing the older queue.
RxDB collection schema versions and migration strategies are independent of
Drizzle migrations; a client schema change must bump its RxDB version and
preserve or explicitly resolve pending local writes.
