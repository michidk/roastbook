# ADR 0001: One SQL journal in the browser and on the server

- Status: Accepted
- Date: 2026-11-04

## Context

The installed app must work fully offline and sync later, the demo must be
editable in the visitor's browser, and every journal query should exist once.
The server keeps using its own database (PostgreSQL or D1) directly, without an
in-memory journal or a server cache.

## Decision

Journal reads and writes are SQL journal functions in `src/journal/`. The
browser runs them on PGlite in a shared worker, persisted in IndexedDB; the
server runs them on PostgreSQL or D1. Platform modules
(`src/journal/platform/*`) supply database, storage, images, clock,
configuration and side effects for each side.

A local write records its function name, input and generated values (ids,
paths, time) in an outbox row in the same transaction. The server replays it
once with those values (receipts). A revision check decides when to download
the owner's rows; pending writes then run again on top. The demo is the same
runtime with fixture data and no sync.

## Rejected alternatives

- Document stores with JavaScript queries (RxDB): a second implementation of
  every query, or a server that computes in memory.
- Sync services (Zero, PowerSync, ElectricSQL): no offline writes or no D1, and
  an extra service per installation.
- `@tanstack/offline-transactions`: drops rejected writes and keeps its outbox
  outside the database.

## Consequences

- One query implementation, used by pages, sync replay and MCP.
- The browser downloads the database engine (about 5 MB compressed) once.
- Writes must be replayable: referenced records take ids from
  `allocateJournalIds`; time and UUIDs come from `@/journal/platform/clock`.
- Journal SQL stays portable: hosted browsers run PostgreSQL, the server D1.
