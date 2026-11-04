# ADR 0013: One SQL journal in the browser and on the server

- Status: Accepted
- Date: 2026-11-04
- Supersedes: [ADR 0012](0012-rxdb-tanstack-db-offline.md)

## Context

The installed app must be fully usable offline and sync later, the demo must
be editable in the visitor's browser, and every journal query should exist
once. RxDB stores documents and queries them with its own language, so a
local journal on RxDB needs a second implementation of every query and rule.
The server must keep using its database (PostgreSQL self-hosted, D1 hosted)
directly, without an in-memory journal or a server cache.

## Decision

Journal reads and writes are SQL journal functions in `src/journal/`. The
browser runs them on PGlite (PostgreSQL in WebAssembly) in a shared worker,
persisted in IndexedDB; the server runs them on PostgreSQL or D1. Platform
modules (`src/journal/platform/*`) supply the database, storage, images,
configuration and side effects for each side.

Sync is our own and small: a local write records its function name, input and
generated values in an outbox row in the same transaction; the server replays
it with those values once (receipts); a revision check decides when to
download the owner's rows, after which pending writes run again. The demo is
the same runtime with fixture data and no sync.

## Alternatives considered

- RxDB with JavaScript queries on both sides: no duplication, but the server
  would compute in memory instead of using its database.
- A Drizzle adapter for RxDB: Drizzle emits SQL, so this means writing a SQL
  engine; PGlite is that engine.
- Zero: no offline writes, PostgreSQL only.
- PowerSync, ElectricSQL: an extra service per installation, no D1.
- `@tanstack/offline-transactions`: needs TanStack DB collection mutations,
  drops rejected writes, and keeps its outbox apart from the database.

## Consequences

- One query implementation; MCP uses the same functions.
- The browser downloads the database engine (about 5 MB compressed) once; the
  service worker keeps it for offline starts.
- Writes must be replayable: records that others reference take identifiers
  from `allocateJournalIds`, and generated storage paths are recorded.
- Hosted browsers run the PostgreSQL dialect while the server runs D1; journal
  functions stay portable across both, as before.
