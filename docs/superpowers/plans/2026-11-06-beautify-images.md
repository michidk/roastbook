# Beautify images implementation plan

> Execute in the existing isolated feature worktree, task by task.

**Goal:** Add remembered primary-image beautification and individual actions.

**Architecture:** A server operation loads an owned image, calls the configured
image editing endpoint, records usage, and applies a portable journal write.
An original path on image records preserves the source without extra gallery slots.

**Tech stack:** Bun, TypeScript, React, TanStack Start, Drizzle, PostgreSQL/PGlite.

**Spec:** `docs/superpowers/specs/2026-11-06-beautify-images-design.md`.

## Global constraints

Keep originals, preserve tenant isolation and storage limits, never replay paid
requests. No paid requests from the static demo. Publish signed API commits with
required co-authors, then create the explicitly requested PR.

## Review focus

- Missing or inconsistent usage must not become zero cost.
- A failed edit must leave the original display and storage intact.
- Concurrent delete/replacement must not attach an edit to the wrong image.
- Original files must participate in quota, deletion, exports and orphan checks.
- Changing the primary image must not automatically edit every upload.

## Tasks

- [x] Add database preference, original image fields, and persistent accounting.
  Generate migrations and validate browser migration compatibility.
- [x] Implement image usage pricing and optional PostHog reporting, with tests
  for mixed modalities, cached usage, missing usage, and non-OpenAI pricing.
- [x] Add portable image replacement and server editing operation. Test owner
  isolation, original retention, failures, deletion and quota admission.
- [x] Add remembered upload control and per-image gallery action. Wire automatic
  editing only after original upload and for the current primary image.
- [x] Update configuration, user-facing documentation, and run check, typecheck,
  targeted tests, integration services, verify and visual checks when available.
- [x] Review changes, publish signed API commit, verify attribution/signature,
  and create and link the GitHub PR.

## Execution results

`bun run verify` passed, including the production build and PGlite runtime tests.
The isolated PostgreSQL/S3 integration run passed 87 tests across 21 suites.
Two additional provider-fixture integration tests verified persistent usage after
invalid output and successful output without image payload logging. Helm lint,
Docker Compose validation, schema drift and targeted transport checks passed.
No paid provider call or browser visual pass was performed.

Review fixes retain originals during device media collection, synchronize pending
online uploads before editing, and save edits within the same journal request so
concurrent clicks do not create duplicate successful provider requests.
