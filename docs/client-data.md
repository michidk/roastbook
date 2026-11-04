# Client journal architecture

The demo, browser product, and installed product PWA use the same local journal
commands and read models. Installation changes application startup and asset
caching; it does not select another database or synchronization path.

## Ownership and packages

- `packages/journal-domain` defines portable row schemas, decimal normalization,
  command/state formats, foreign keys, unique constraints, and a transaction
  workspace. The model generator reads Drizzle metadata at development time.
- `packages/journal-client` persists the journal, outbox, and image bytes in
  RxDB using Dexie and IndexedDB. TanStack DB projects committed revisions into
  reactive queries.
- `packages/journal-demo` supplies fictional bootstrap data, isolated storage,
  reset controls, and the few unavailable-service modules that are not server
  functions. `scripts/vite-demo-services.ts` generates the rest: in the demo
  build, every unsuffixed `src/lib/server` or `src/lib/mcp` module that defines
  `createServerFn` becomes exports that fail with the demo message.
- `src/modules/journal` contains shared input validation, journal commands,
  relationships, image metadata, and read calculations.
- `src/lib/client/journal` connects existing typed route contracts to local
  operations in the browser and server functions during server execution.
- `src/lib/edition-journal.ts` supplies the product's authenticated transport.
  The demo build selects its own entry point through Vite aliases.
- `src/lib/server/journal-snapshot.server.ts` authorizes and applies synchronized
  commands through Drizzle and the existing PostgreSQL/D1 journal boundary.
  `journal-mutation-plan.server.ts` constructs its atomic SQL batch, including
  relationship ordering, the revision assertion, receipt, queued media cleanup,
  and the final revision.

Shared packages cannot import application or server implementations. Product
output cannot include demo modules or fixtures. Browser output cannot include
SQL engines, database drivers, secrets, or server implementations. Import checks
and emitted-module checks enforce these rules. Generated demo services and the
remaining demo aliases never compile server implementations into the browser.

## Read and write behavior

Client adapters declare `journalRead` or `journalWrite` with an operation name
checked against the shared registry. Suggestions use the same read registry.
JSON storage conversion and date restoration live in
`src/modules/journal/serialization.ts`. The server transport remains responsible
for authorization and delivery; it does not decide domain behavior.

After a complete first download, local data is the source for lists, details,
relations, pagination, search, counts, overview, statistics, suggestions, settings,
and ordinary journal edits. A failed initial download is an error, not an empty
journal. Initial product download requires a connection and an authorized account.
The demo downloads its public, build-generated fixture JSON instead.

A command validates input and relationships in a private workspace. RxDB commits
its resulting tables, new image bytes, identifier reservations, and outbox entry
in one document. A rejected command changes none of those values. After the
commit, new image bytes move to a separate `media` collection; if that fails,
they stay in the journal document and move after a later command or reopen.
Deleting an image row removes its stored variants. There is no cross-collection
optimistic transaction that could persist only half a command.
Queries wait for the committed revision before returning results. Subscribers
invalidate active routes when a committed revision changes, including changes
received from another tab.

This design deliberately stores the journal tables in one aggregate document.
TanStack DB currently reacts to aggregate revisions and executes shared read
calculations; it does not incrementally join normalized per-entity collections.
Mutations clone and validate every journal row, but not stored image bytes. This
costs memory and local write time proportional to the number of records. Do not
describe this as a large-journal performance optimization. TanStack DB is pinned
to `1.0.0-rc.1.2`.

## Product synchronization

Each local command has a UUID and saved identifier allocations. The server
reserves 256 numeric identifiers per table, replenishing pools below 128 on a
successful refresh. Offline creates stop with a recoverable message when a table's
pool runs out. Reconnect to reserve more; existing changes remain saved.

Every write first creates the owner's settings and revision rows if needed and
drains media cleanup from earlier committed requests. Journal reads never write.
The server then loads one consistent owner-scoped snapshot, replays the same
validated command, and commits its SQL diff, revision assertion, idempotency
receipt, and final revision in one protected batch. The batch ends at exactly
the previous revision plus one, so the server returns only that revision unless
another device or integration had changed the journal. Then it returns the
resulting journal and the client replays its later commands on top. PostgreSQL
retains transaction-local RLS identity. D1 retains explicit ownership predicates
and its atomic mutation-batch contract. Database triggers advance journal
revisions for writes from existing server integrations. A lost response can
replay the same command without creating a second record.

Synchronization sends saved commands in order before refreshing. A refresh sends
the local revision and downloads the journal only when the server revision
differs. A remote refresh cannot overwrite concurrent local edits. Changes from
another device do not block a command that still applies to the latest journal;
the server replays it there. A command that no longer applies, such as an edit to
a record deleted elsewhere or a brew edited from an older version, is a conflict.
Explicit server rejections remain visible as conflicts, authentication
requirements, or failures. Review changes
allows downloading the local journal, retrying, explicitly applying conflicting
edits to the latest revision, or replacing pending changes with the server copy.
Client validation never replaces server authorization.

Existing product offline caches and pending operations remain in their original
account partition. New journal edits and synchronization wait until earlier
nonterminal operations are drained or resolved through Pending changes. Earlier
work is never silently discarded or sent through both mutation paths. The older
queue is retained for recovery only; ordinary forms no longer insert into it.

## Images and storage failures

Image intake shares the existing MIME, size, and dimension checks. Browser
compression creates WebP versions bounded to 1600, 640, and 128 pixels. The journal
stores metadata with its records, keeps bytes in the media collection, and
displays local blob URLs. Product sync
validates image bytes again and writes owner-namespaced media through the normal
storage provider. Demo media has no transport.

Product image deletion queues cleanup with its database mutation. The next
journal write removes the stored variants, after the deleting transaction has
committed.
Rolling back a deletion leaves its picture bytes intact.

The saved format has an explicit version. An unsupported or invalid saved record
fails without reseeding or overwriting it. Quota failures leave the prior commit
intact. RxDB handles cross-tab document revisions; product delivery also uses Web
Locks when available and server receipts/revision checks in all cases. Browser
storage remains per-device, unencrypted by Roastbook, and subject to browser
clearing or eviction. Pending changes are not backed up until confirmed by the
server.

## Development and verification

Add ordinary operations to the shared command/read definitions and their client
facade. Reuse existing validation, image helpers, and UI components. Integrations,
authentication, and account administration remain separate server operations.

Run `bun run verify`, `bun run build:demo`, and the hosted checks described in
[Development](development.md). Use isolated PostgreSQL and S3 services for
`bun run test:integration`. Tests cover persistence, transactional relationships,
reactive results, quota rollback, replay, conflicts, owner isolation, and SQL read
parity. See [Offline journaling](offline.md) and [Browser-local demo](demo-mode.md)
for user-facing behavior and limitations.
