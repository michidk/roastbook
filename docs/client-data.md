# Journal architecture

Every journal read and write is one SQL journal function in `src/journal/`. It
runs on the server on PostgreSQL, and in browsers that keep a device copy
on PGlite (sync replay, MCP and browser tabs without a copy use the server).
`src/journal/local/device-copy.ts` decides: the demo and the installed app
always keep a copy. Browser tabs reuse existing copies, including those enabled
by the former offline setting, without deleting pending changes. Other tabs call
`callJournal` in `src/lib/server/journal-sync.ts`. See
[ADR 0001](adr/0001-sql-journal.md) for the
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

- `database`: request scope with RLS; in the browser, a PGlite transaction as
  the owner with the same role and RLS.
- `storage`: disk or S3; in the browser, picture bytes in the local
  database, in the record's transaction.
- `images`: sharp; in the browser, canvas. Sizes come from
  `src/lib/picture-sizes.ts`. Pictures the browser encoded arrive with their
  thumbnails and are only checked, never encoded again.
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
- **Pull.** Triggers on every journal table advance the owner's revision and
  record the changed row's key in `journal_changes`, so MCP and integrations
  count. A device without pending writes downloads only the rows changed since
  its revision (a key without a row was deleted); otherwise, or past 5,000
  changes, it replaces the owner's rows and reruns pending writes on top.
- **Startup.** Pages open on the device copy at once while it syncs, and
  reload when the sync downloads changes; a sync that takes over a second adds
  an updating notice. Tabs without a copy reload their page when they become
  visible after more than 30 seconds hidden.
- **Reservations.** The server reserves 256 identifiers per table and device
  (`journal_id_reservations`), reusing the oldest once more than 1024 are
  unused. Every insert into a table with a serial `id` takes it from
  `allocateJournalIds`; synced local journals exhaust their sequences, so a
  database default fails instead of diverging from the server.
- **Conflicts.** A write the server can never apply, one that no longer applies
  after a pull, or one that failed 12 times becomes a conflict with Try again
  and Discard in the sync banner; later writes continue. Infrastructure
  failures retry with backoff. A pull for a different account is refused.
- **Without transactions.** On a database without interactive transactions, a
  replay counts as applied when its receipt or all of its recorded identifiers
  already exist.

RxDB queues from earlier versions are replayed once as journal writes by
`legacy-offline.ts`, keeping their original operation ids as outbox keys.

## Verification

- `bun run test:browser-runtime`: `*.browser.test.ts` on in-process PGlite.
- `src/lib/server/journal-sync.integration.test.ts`: replay on PostgreSQL.
- `bun run check:client-assets`: database engine only in the worker, no
  secrets in client assets.

User-facing behavior: [Offline journaling](offline.md) and
[Browser-local demo](demo-mode.md).
