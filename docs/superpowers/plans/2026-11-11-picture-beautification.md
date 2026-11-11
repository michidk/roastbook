# Picture beautification implementation plan

> Execute inline using the executing-plans skill.

**Goal:** Make beautification explicit and show its lifecycle without blocking
other work.

**Architecture:** Keep the existing server request and shared client status.
Use one shared button for gallery and viewer explanations. Retain legacy
settings in storage but disable their automatic behavior.

**Tech stack:** React, TypeScript, Bun, shared UI, Sonner.

**Spec:** [Approved design](../specs/2026-11-11-picture-beautification-design.md).

## Constraints and review focus

No new dependencies or schema changes. No provider calls during verification.
Check duplicate requests, provider failure and retry, stale automatic requests,
already-edited images, and refresh failure after a successful paid edit.

## Tasks

- [x] Remove the toggle and upload/star triggers; move availability into a hook.
  Disable legacy automatic requests before provider work. Update their test.
- [x] Centralize toast lifecycle and duplicate protection in the client helper.
  Add button tooltip, visible viewer help, and picture status. Remove component
  loading state that blocks unrelated uploads. Test success, failure/retry,
  duplicates, no-op results, and post-edit sync failures.
- [x] Update README and configuration docs. Run targeted tests, code checks,
  typecheck, and inspect the final diff. Browser checks are not run unless
  requested, per the active T3 tool instructions.

## Verification

`bun run verify` passed: code and documentation checks, typecheck, 596 tests
plus 20 browser-runtime tests, dead-code analysis, production build, client
asset budgets, and PWA checks. The test runner skipped 123 tests, including
integration tests requiring external services. No visual browser pass ran.

Independent review found that sync failures are recorded rather than thrown.
The client now checks recorded sync status before reporting completion, with
coverage for that case. Legacy setting writes remain registered for replay.
