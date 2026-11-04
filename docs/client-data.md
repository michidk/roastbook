# Journal architecture

Every journal read and write is one SQL journal function in `src/journal/`. It
runs in the browser on PGlite and on the server on PostgreSQL or D1 (sync
replay, MCP, server features). See [ADR 0001](adr/0001-sql-journal.md) for the
decision.

## Journal functions

```ts
export const getBean = journalRead('beans/getBean')
  .validator(positiveIdSchema)
  .handler(async ({ data: id }) => db.query.beans.findFirst(/* … */))
```

- Name functions `<module>/<export>` and register the module in
  `src/journal/registry.ts`; `src/journal/function.test.ts` checks both.
- Callers use `getBean({ data })`. Inputs are validated wherever the function
  runs, including replay.
- Journal code reaches the database, storage, images, configuration, time and
  side effects only through `src/journal/platform/*`; the import-boundary check
  enforces this.
- Integrations (AI research, accounts, geocoding, email, shottimer) are
  ordinary server functions in `src/lib/server/` and need a connection.

## Platform modules

Each module has a server version and a `*.browser.ts` version, selected for the
client build by `scripts/vite-journal-platform.ts` (the demo build also selects
`packages/journal-demo/src/edition.ts`).

- `database`: request scope with RLS (PostgreSQL) or owner predicates (D1); in
  the browser, a PGlite transaction as the owner with the same role and RLS.
- `storage`: disk, S3 or R2; in the browser, picture bytes in the local
  database, in the record's transaction.
- `images`: sharp; in the browser, canvas with the same sizes and limits.
- `config`: environment; in the browser, cached server limits or demo defaults.
- `clock`: `journalNow`, `journalUuid` and schema timestamp defaults. Never use
  `new Date()` or `crypto.randomUUID()` in journal code; browser values are
  recorded so replay writes identical rows.
- `effects`: website icon fetches; none in the browser (the server fetches on
  replay).
- `runtime`: runs in the journal scope; in the browser, also records the outbox
  entry.

## Local journal

`src/journal/local/`:

- `worker.ts` opens `idb://roastbook-journal-<owner>` (or `roastbook-demo`),
  applies the server migrations (`migrate.ts`) and creates the
  `roastbook_local` schema (migrations, state, outbox, reserved identifiers,
  picture bytes). Only the worker loads the database engine.
- `client.ts` shares one database across tabs via PGlite's leader worker (Web
  Locks; HTTPS or localhost). One function runs at a time per tab, with
  `roastbook.user_id` set and the `roastbook_journal` role.
- A write resolves after IndexedDB holds the change and its outbox entry and
  open pages have reloaded; pages never refresh by hand after a write.
- Each owner has a separate database; sign-out removes it once everything has
  synced.

## Synchronization

`src/journal/local/sync.ts` talks to `src/lib/server/journal-sync.ts`.

- **Outbox.** A local write stores, in the same transaction, the function name,
  its encoded input (`src/journal/codec.ts`), a UUID key, and its generated
  values: reserved identifiers, picture paths, UUIDs and time.
- **Push.** Writes replay strictly in order with the recorded values. A
  receipt makes each key apply once. Recorded identifiers must be reserved for
  the owner; recorded paths must have the expected shape and not exist yet. A
  failed replay deletes only objects it uploaded.
- **Pull.** When the owner's revision changed elsewhere (triggers advance it on
  every journal table, so MCP and integrations count), the browser replaces the
  owner's rows and reruns pending writes on top.
- **Reservations.** The server reserves 256 identifiers per table and device
  (`journal_id_reservations`), reusing the oldest once more than 1024 are
  unused. Records that others reference must take identifiers from
  `allocateJournalIds`; pure link rows may use defaults.
- **Conflicts.** A write the server can never apply, one that no longer applies
  after a pull, or one that failed 12 times becomes a conflict with Try again
  and Discard in the sync banner; later writes continue. Infrastructure
  failures retry with backoff. A pull for a different account is refused.
- **D1.** Without transactions, a replay counts as applied when its receipt or
  all of its recorded identifiers already exist.

RxDB queues from earlier versions are replayed once as journal writes by
`legacy-offline.ts`, keeping their original operation ids as outbox keys.

## Verification

- `bun run test:browser-runtime`: `*.browser.test.ts` on in-process PGlite.
- `src/lib/server/journal-sync.integration.test.ts`: replay on PostgreSQL.
- `bun run test:cloudflare`: replay on D1.
- `bun run check:client-assets`: database engine only in the worker, no
  secrets in client assets.

User-facing behavior: [Offline journaling](offline.md) and
[Browser-local demo](demo-mode.md).
