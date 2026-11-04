# Journal architecture

Every journal read and write is implemented once, as SQL, in a journal function
under `src/journal/`. The same function runs in two places:

- **In the browser**, against the visitor's own PostgreSQL database: PGlite in a
  shared worker, persisted in IndexedDB. Every journal page reads and writes it,
  online or offline.
- **On the server**, against PostgreSQL (self-hosted) or D1 (hosted), to replay
  browser writes, for MCP, and for server-side features.

There is no second query implementation, no server-side journal cache, and no
browser-only data model.

## Journal functions

```ts
export const getBean = journalRead('beans/getBean')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => db.query.beans.findFirst(/* … */))

export const createBean = journalWrite('beans/createBean')
  .validator(beanCreateSchema)
  .handler(async ({ data }) => {/* … */})
```

- The name is `<module>/<export>`. `src/journal/function.test.ts` checks every
  name and that `src/journal/registry.ts` loads every module.
- Callers use `getBean({ data })`, like a TanStack server function.
- Inputs are validated where the function runs, including on server replay.
- Journal code imports the database, storage, image processing, configuration
  and side effects only from `src/journal/platform/*`. The import-boundary
  check rejects server-only imports anywhere else in `src/journal/`.
- Integrations (AI research, accounts, geocoding, email, shottimer) stay
  ordinary TanStack server functions under `src/lib/server/`. They need a
  connection and are unavailable offline and in the demo.

## Platform modules

Each module has a server version and a `*.browser.ts` version:

- `database`: the PostgreSQL/D1 request scope with RLS or owner predicates; in
  the browser, a local PGlite transaction as the owner, with the same role and
  RLS.
- `storage`: disk, S3 or R2; in the browser, picture bytes in the local
  database, in the same transaction as their record.
- `images`: sharp; in the browser, decoding and canvas with the same sizes and
  limits.
- `config`: the environment; in the browser, server limits kept for offline use,
  or demo defaults.
- `clock`: the time and generated UUIDs of a write (`journalNow`,
  `journalUuid`, and the schema's timestamp defaults); in the browser they are
  recorded, so the server replay writes identical rows.
- `effects`: website icon fetches; nothing in the browser, since the server
  fetches during replay.
- `runtime`: runs in the request's journal scope; in the browser, runs in the
  local journal and records writes in the outbox.

`scripts/vite-journal-platform.ts` selects the browser modules for the client
build. The demo build also selects `packages/journal-demo/src/edition.ts`.
Page code builds SQL with Drizzle and sends it to the worker; only the worker
loads the database engine.

## Local journal

`src/journal/local/` holds the browser runtime:

- `worker.ts` opens `idb://roastbook-journal-<owner>` (or `roastbook-demo`),
  applies the server's migrations in order (`migrate.ts`), and creates the
  `roastbook_local` bookkeeping schema: applied migrations, state, outbox,
  reserved identifiers and picture bytes. It compiles the engine from bytes, so
  servers need not send `application/wasm`.
- `client.ts` shares one database between tabs through PGlite's leader worker
  (Web Locks; HTTPS or localhost only). It runs one journal function at a time
  per tab, in a transaction with `roastbook.user_id` set and the
  `roastbook_journal` role, exactly like the server.
- Reads skip the IndexedDB flush. A write returns only after IndexedDB has the
  change and its outbox entry.
- Each owner has a separate database. Signing out removes it after every change
  has synced.

## Synchronization

The product edition (`src/journal/local/edition.ts`, `sync.ts`) syncs with
three endpoints in `src/lib/server/journal-sync.ts`:

1. **Write.** A local write records, in the same transaction, the function name,
   its encoded input (`src/journal/codec.ts`: dates, files and form data
   survive), a UUID key, and the values it generated: identifiers from the pool
   the server reserved for this device, picture storage paths, generated UUIDs,
   and the time of the change. Journal code takes time and UUIDs from
   `@/journal/platform/clock`, never `new Date()` or `crypto.randomUUID()`, so
   a record created offline keeps the time it was made.
2. **Push.** Pending writes replay strictly in order on the server with the
   recorded values; a write waiting to retry holds back later ones. A receipt
   makes each key apply once. Recorded identifiers must be ones the server
   reserved for this owner. Recorded paths must have the expected shape for
   their record and must not exist yet; a failed replay deletes only objects it
   uploaded. The reply says whether anything else changed the journal since
   the browser's revision.
3. **Pull.** A revision check; when another device or integration changed the
   journal, the browser replaces the owner's rows and runs its pending writes
   again on top, with their recorded values.
4. **Identifiers.** The server reserves 256 identifiers per table and device
   and records them per owner (`journal_id_reservations`). With more than 1024
   unused ones for a table, it hands out the oldest again instead of new ones.
   Records that other records reference must take identifiers from
   `allocateJournalIds`; pure link rows may use database defaults.
5. **Conflicts.** The server marks a write it can never apply (validation,
   missing records, ownership); that write, one that no longer applies after a
   pull, or one that failed 12 times is kept as a conflict. The sync banner
   lists it with Try again and Discard, and later writes continue. Busy,
   connection and other infrastructure failures retry with backoff.
6. **Accounts.** A pull for a different signed-in account is refused, so it
   never fills another owner's local journal.

Triggers advance the owner's revision for every journal table on PostgreSQL and
D1, so changes from MCP and integrations reach browsers too. On PostgreSQL the
request transaction and per-owner lock make replay atomic and its revision
check exact. D1 has neither. A replay that applied but failed before its
receipt, or a simultaneous push of the same change, counts as applied when its
receipt or every identifier it recorded already exists. A change another device
makes during a replay shows on this device only after the next revision change.

A write in a tab resolves after the open pages reloaded their data (the root
route listens for local changes), so pages never refresh by hand after a
journal write. Downloads refresh every tab the same way.

## Earlier offline data

Versions before this design queued brew and recipe changes in RxDB. On open,
`legacy-offline.ts` replays those pending operations as journal writes, then
deletes the old stores. Each keeps the operation id it was first sent with as
its outbox key, and the migration that removed the old operation ids kept them
as receipts, so a change the server already has never applies twice. The move
holds the sync lock and skips changes already in the outbox, so it can run
again; until everything moved, each start retries the rest and Settings →
Offline reports how many remain.

## Development and verification

- `bun run test:browser-runtime` runs `*.browser.test.ts` with the browser
  platform against an in-process PGlite: local writes, outbox entries, identifier
  pools, rollback and replay after a refresh.
- `src/lib/server/journal-sync.integration.test.ts` replays recorded writes on
  PostgreSQL: identifiers, receipts, revisions, owner isolation and picture paths.
- `bun run test:cloudflare` replays recorded writes on D1.
- `bun run check:client-assets` allows the database engine only in the journal
  worker, and secrets nowhere.

See [Offline journaling](offline.md) for user-facing behavior and
[Browser-local demo](demo-mode.md) for the demo.
