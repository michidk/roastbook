# ADR 0012: RxDB persistence with TanStack DB collections

- Status: Accepted for the first vertical slice
- Date: 2026-10-28

## Context

Roastbook already has a hand-written IndexedDB cache and operation log for
offline brews and recipes. The requested target is to use RxDB for durable
browser state and replication, with TanStack DB as the reactive application
layer, while keeping TanStack Start, Drizzle, PostgreSQL, and Vercel.

The official `@tanstack/rxdb-db-collection` adapter is available as an MIT
package and mirrors an RxDB collection into a reactive TanStack DB collection.
The adapter's sync is explicitly between RxDB and the in-memory TanStack DB
collection; network replication remains RxDB's responsibility. RxDB's core
package is Apache-2.0 and provides replication handlers, checkpoints, retries,
conflict hooks, schema versions, and multi-instance coordination.

RxDB's native IndexedDB storage package is a premium plugin. The open-source
`rxdb/plugins/storage-dexie` adapter stores through IndexedDB-compatible Dexie
storage and is therefore the selected browser storage for this project.

## Decision

The first vertical slice uses recipes as the representative synchronized
entity:

1. A browser-only RxDB database stores recipe documents using Dexie storage.
2. `@tanstack/rxdb-db-collection` exposes the RxDB collection to TanStack DB.
3. RxDB's `replicateRxCollection` calls TanStack Start pull and push routes.
4. The server reads and writes PostgreSQL through Drizzle and validates every
   request with Zod.
5. A monotonic PostgreSQL change sequence provides deterministic checkpoints.
6. Push operations use RxDB's `assumedMasterState` for optimistic concurrency;
   conflicts return the current authoritative document for RxDB to resolve.
7. TanStack DB owns the UI-facing reactive collection. RxDB owns persistence,
   replication metadata, retries, and durable local writes.

The existing offline operation log remains in place during the vertical slice.
It is not used by the RxDB recipe collection, so the two systems cannot silently
compete for the same writes. Migration of existing brew and recipe UI paths is a
later step after the integration is proven.

## Consequences

This adds one client database and a small server change-log table for the
vertical slice. The server change log is required because RxDB pull needs an
ordered, resumable history including deletion markers. Existing route loaders
and mutations remain unchanged until the slice passes integration and browser
verification.

The slice does not provide realtime push notifications. Replication is live in
RxDB's terminology (retrying and polling around connectivity), and starts on
initialization, reconnect, and document visibility. Vercel functions remain
request/response only.

RxDB collection schema versions are independent of Drizzle migrations. A
collection schema change requires a new RxDB version and migration strategy;
PostgreSQL changes still use the repository's Drizzle workflow. Pending local
writes must be migrated or explicitly discarded by a future migration strategy.

## Compatibility and licensing evidence

- [TanStack DB RxDB collection documentation](https://tanstack.com/db/latest/docs/collections/rxdb-collection)
- [TanStack DB adapter package](https://www.npmjs.com/package/@tanstack/rxdb-db-collection)
- [RxDB replication documentation](https://rxdb.info/replication.html)
- [RxDB HTTP replication guidance](https://rxdb.info/replication-http.html)
- [RxDB storage documentation](https://rxdb.info/rx-storage.html)
