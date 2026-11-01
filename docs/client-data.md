# Client data boundaries

Roastbook has standard and demo build editions. Installing the standard app
uses the same routes and components as a browser tab. Connectivity is a runtime
condition, independent of installation. The demo supports neither installation
nor offline storage, queued changes, or replication.

## Adding a component

Presentation components receive data and callbacks. They do not choose between
server writes and browser storage. For brew and recipe actions, import commands
from `src/lib/client/journal.ts`. Picture actions use `journal-images.ts` and AI
recommendations use `ai-recommendations.ts` in the same directory.

Journal commands validate inputs, assign an operation ID, and return one of:

- `saved`, with the server response in `value`;
- `queued`, with the durable local `operationId`.

Handle that result with the appropriate confirmation and navigation. Run UI
callbacks after the command returns. A failed refresh must never queue a second
write after the server already committed the first one. Validation, permission,
and conflict errors propagate without switching to offline persistence.

`featureAvailability` in `src/lib/app-capabilities.ts` defines which actions
are available. `useFeatureAvailability` supplies current connectivity to UI
controls. Journal writes can queue offline; AI and server-only actions require
a connection. Every demo write is blocked, including direct local queue calls.
The server request middleware remains the demo's server-side enforcement.

## Adding a cached route

Use `loadEntityDetail` or `loadReferenceData` from
`src/lib/client/cached-reads.ts`. Declare the entity or reference key and the
normal loader. Use `accepts` when a snapshot must match search parameters, and
`restore` when a saved detail needs supplementary cached reference data.

For the initial server-rendered visit, use `useEntitySnapshot` or
`useReferenceSnapshot` with the stable loader result. These hooks save the
hydrated response and skip saved-copy responses. Cache failures do not prevent
an online page from loading. Only network failures permit a saved response;
server permission and validation errors remain visible.

## Persistence and synchronization

RxDB stores the operation log, entity/reference snapshots, and picture blobs.
The operation log is the sole client write path for queued journal changes.
It owns idempotency IDs, revisions, dependencies, retries, and conflicts.
`journal-sync.ts` runs synchronization; `journal-sync-operations.ts` adapts each
operation to the existing server domain boundary.

Recipe replication only pulls server changes. Received changes invalidate
active route data so another device's edits become visible. Local recipe
commands use the same operation log as brews, never a second replication push
path. The replicated recipe collection remains compatible with existing local
data, and recovery/reset cancels replication before closing its database.

## Enforcement and verification

`bun run check:boundaries` rejects direct brew/recipe server mutations and raw
queue insertion imports in components, routes, and hooks, including aliases.
Feature adapters live in `src/lib/client/` because reusable pure modules must
not import application server functions.

Run `bun run verify` for source, type, unit, production-build, and PWA checks.
Also run `bun run build:demo` to verify the demo artifact has no install
manifest or offline page and only a retiring service worker. Use isolated
PostgreSQL and S3 services for `bun run test:integration`.
