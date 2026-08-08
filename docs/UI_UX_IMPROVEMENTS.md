# Roastbook UI/UX Improvements

Status: P0 reliability complete; P1/P2 remain planned  
Evidence: Playwright verification at 375×812, 768×1024, and 1280×900 using the Docker-backed local dataset, plus independent goal, quality, security, QA, repository-context, and dual visual reviews.

## Product principles

1. Logging a shot is the primary workflow and must remain reachable with one thumb.
2. Brewing data should be compact, comparable, and explicit about missing values.
3. Media, charts, and maps always render useful content or a designed unavailable state.
4. Warm, tactile styling is preserved while interaction, accessibility, and data density improve.
5. Improvements use existing shadcn primitives and the contract in `DESIGN.md`.

## What already works

- Distinctive warm coffee palette and paired display/body typography.
- Clear dashboard hierarchy and strong quick-create affordances.
- Useful bean-level parameter trends and shot history.
- Consistent shared cards, controls, route loading, and route error components.
- Mobile create action is centered and easy to reach.

## P0 — Reliability and trust

These items block visual polish because they present valid data as broken or obstruct core navigation.

### P0.1 Resilient images

- **Problem:** bean, gear, and shot images expose native broken-image glyphs; thumbnail requests return 404 repeatedly.
- **Implementation:** centralized stored media in a resilient image primitive that preserves dimensions, defers lazy upload fetches until intersection, keys fetch eligibility to the current source, renders object URLs, and swaps to a labeled coffee-themed fallback on failure. Thumbnail URLs include their original image as an endpoint fallback, while configured CDN/storage bases retain path-style URLs.
- **Acceptance:** dashboard, shots, beans, and gear show no native broken-image glyph; browser console/network has no repeated image 404 noise from missing thumbnails.
- **Status:** completed. Dashboard, shots, beans, and gear render stored media without native broken-image glyphs or image-request 404 noise.

### P0.2 Statistics activity visualization

- **Problem:** “Last 30 Days Activity” is a blank card despite historical shot data.
- **Implementation:** verify the data window and chart dimensions; render the chart when points exist and an explicit no-recent-activity state otherwise.
- **Acceptance:** `/stats` shows labeled activity data or a clear no-activity explanation at 375px, 768px, and 1280px.
- **Status:** completed. The activity series fills the complete 30-day window and the card renders either a sized chart or an explicit no-activity state. Nullable PostgreSQL numeric aggregates are normalized at the server boundary, missing averages are labeled explicitly, date-only keys remain on their stored calendar day, and chart labels meet the 14px design minimum.

### P0.3 Place maps

- **Problem:** list/detail maps are blank or nearly context-free and provide no failure state.
- **Implementation:** verify MapLibre CSS/style initialization and bounds; show a clear fallback with coordinates and an external map link when tiles cannot render.
- **Acceptance:** `/places` and `/places/:id` show useful map context or a designed unavailable state, never an unexplained blank rectangle.
- **Status:** completed. Successful maps render accessible markers and compact popups. Tile errors and stalled loads switch to a designed fallback with coordinates, Retry, and OpenStreetMap actions; retry creates a fresh map lifecycle and restores the ready state after recovery.

### P0.4 Hydration-safe form controls

- **Problem:** React reports server/client attribute mismatches around input and textarea caret styles.
- **Implementation:** remove client-only presentation mutations and keep shared controls deterministic across SSR and first hydration.
- **Acceptance:** visiting create forms produces no hydration mismatch and typing shows a normal visible caret.
- **Status:** verified. Isolated direct loads and real typing on `/visits/new` produced deterministic markup with no hydration warning.

### P0.5 Development tooling isolation

- **Problem:** TanStack Devtools overlaps and intercepts the mobile More navigation trigger.
- **Implementation:** load development tooling only in development and position/contain it so product navigation remains operable.
- **Acceptance:** at 390×844 the More trigger opens with a real pointer click; production build contains no interactive devtools overlay.
- **Status:** completed. Devtools are hover-contained at middle-right, mobile navigation remains clickable through tablet widths, and production builds strip the devtools code.

## P1 — Primary workflow and information architecture

### P1.1 Make Shots a primary mobile destination

- Swap Shots into the visible mobile navigation and move a lower-frequency library destination into More.
- Keep the centered New action as the fastest route to shot capture.

### P1.2 Make shot history usable at scale

- Add search, date range, bean/recipe filters, sorting, and server-backed pagination.
- Replace the compressed mobile table with readable shot summary rows/cards.
- Preserve deep links and keyboard-open behavior by using semantic Links.

### P1.3 Make roasters manageable

- Make rows navigable to roaster detail.
- Add duplicate detection/merge support and normalize casing.
- Hide consistently empty columns or provide direct inline completion affordances.

### P1.4 Safer management actions

- Give destructive actions visible labels or an accessible destructive menu.
- Require clear confirmation with the entity name and preserve focus afterward.

### P1.5 Align the New Shot workflow

- Keep timer and extraction fields in the same working region.
- Place Save after tasting input in reading order, with a mobile sticky action treatment when appropriate.
- Explain calculated ratio/flow states and timer-to-brew-time behavior.

## P2 — Consistency, accessibility, and polish

- Raise muted text contrast to meet WCAG 2.2 AA on cream surfaces.
- Wire the existing dark palette through a ThemeProvider and settings/menu control.
- Standardize create-form grouping, disabled explanations, footer placement, date format, currency controls, and optional/required language.
- Improve AI bean scanning with numbered steps, camera guidance, progress, extraction confidence, overwrite review, and privacy copy.
- Replace bare hyphens with “Not recorded” or context-specific empty values.
- Add clear hover/focus/chevron affordances to navigable KPI cards and rows.
- Rebalance dashboard Quick Add instead of forcing unused equal-height space.

## Verification gates

Each completed item must pass:

1. Clean LSP diagnostics on changed files.
2. Targeted test proving the regression.
3. Full test suite and production build.
4. Playwright at 375px, 768px, and 1280px on every touched route.
5. Browser console and failed-request inspection.
6. Independent visual QA review on fresh screenshots.

## Change log

- 2026-08-05: Initial audit documented; P0 implementation started.
- 2026-08-05: P0 reliability completed and verified across seven routes at 375px, 768px, and 1280px; all routes returned 200 with no console errors, failed requests, overflow, or broken media.
- 2026-08-05: Final corrective review closed with 12 test files and 24 passing tests, clean TypeScript and Knip checks, a successful production build, fresh responsive visual approval, and PASS verdicts for goal compliance, code quality, security, QA, and repository consistency.
