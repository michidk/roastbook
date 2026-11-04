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
   the server reserved for this device, and picture storage paths.
2. **Push.** Pending writes replay in order on the server with the recorded
   values. A receipt makes each key apply once. Recorded paths must have the
   expected shape for their record and must not exist yet. The reply says
   whether anything else changed the journal since the browser's revision.
3. **Pull.** A revision check; when another device or integration changed the
   journal, the browser replaces the owner's rows and runs its pending writes
   again on top, with their recorded values.
4. **Identifiers.** The server reserves 256 identifiers per table and device.
   Records that other records reference must take identifiers from
   `allocateJournalIds`; pure link rows may use database defaults.
5. **Conflicts.** A replayed write the server rejects, or one that no longer
   applies after a pull, is kept as a conflict. The sync banner lists it with
   Try again and Discard. Later writes continue.

Triggers advance the owner's revision for every journal table on PostgreSQL and
D1, so changes from MCP and integrations reach browsers too. On PostgreSQL the
request transaction and per-owner lock make replay atomic and its revision
check exact.

## Earlier offline data

Versions before this design queued brew and recipe changes in RxDB. On first
open, `legacy-offline.ts` replays those pending operations as journal writes
once, then deletes the old stores. If any operation cannot move, the stores
stay and Settings → Offline reports how many.

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
