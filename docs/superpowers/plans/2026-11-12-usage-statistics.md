# Optional usage statistics implementation plan

## Goal and architecture

Implement the approved design in
[the design document](../specs/2026-11-12-usage-statistics-design.md).
Use TanStack server functions, a first-party consent cookie and restricted
PostHog HTTP capture. No database migration or analytics SDK is needed.

## Tasks

- [x] Add a typed event allowlist, consent parser, bounded delivery and runtime
  disable setting. Wire existing event hooks, excluding replay and integrations.
- [x] Add first-use consent and General settings controls using shared UI.
- [x] Ensure build extensions retain their own event handling.
- [x] Test consent absence, denial, malformed cookies, opt-out, replay, payload
  minimization and failed delivery. Run checks, typecheck and full verification.
- [x] Document the recipient, payload, storage, limitations and administrator flag.

## Review focus

Do not backfill activity after opt-in. Do not link accounts or send content.
Do not collect from demo or integrations. Blocked cookies must fail closed.
Preserve existing build extensions and unrelated work.

## Verification results

`bun run verify` passed, including the production build and asset checks.
Privacy tests cover real request cookies with captured outbound HTTP calls.
Compose configuration and Helm lint passed with disposable validation settings.
An independent source review found no blocking issues. Browser interaction checks
were not run in this session. Integration tests requiring external services were
skipped by the default suite.
