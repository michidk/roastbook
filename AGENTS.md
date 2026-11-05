# Roastbook agent guide

Roastbook is a self-hosted coffee journal built with Bun, TanStack Start,
React 19, shadcn/ui, and Drizzle. Self-hosting uses PostgreSQL with local or
S3-compatible storage. Deploy with Docker or the Helm chart. Better Auth
provides private accounts; Hodor is optional for a shared journal.

## Sources of truth

- Setup and entry points: `README.md`
- Local development and verification: `docs/development.md`
- Runtime configuration: `docs/configuration.md`
- Docker, Helm, and security boundary: `docs/deployment.md`
- Upgrade steps between releases: `docs/upgrading.md`
- Demo edition and Vercel build: `docs/demo-mode.md`
- Visual and interaction rules: `DESIGN.md`
- Design files, capture, and editor: `design/README.md`
- Database schema: `src/db/schema.ts`
- Journal functions, local database, and sync: `docs/client-data.md`
- Journal architecture decision: `docs/adr/0001-sql-journal.md`
- Helm defaults: `charts/values.yaml`

Do not duplicate configuration tables or deployment examples here. Update the
source-of-truth document with each behavior change. Update `README.md` when a
change affects what it documents (features, setup, commands, documentation
entry points, stack); never describe planned work as shipped.

## Architecture boundaries

- Routes live in `src/routes/` (TanStack Router file-based routing).
- Shared UI primitives live in `src/components/ui/`; extend them with `cn()`
  instead of recreating their behavior in routes.
- Reusable page, form, dialog, and entity components live in
  `src/components/`.
- Client-side feature contracts and pure feature logic move to
  `src/modules/<feature>/` once they have two consumers. Modules may import
  `src/lib/` primitives, never routes or server modules.
- Journal reads and writes are SQL journal functions in `src/journal/`
  (`journalRead`/`journalWrite`, named `<module>/<export>`), run in the browser
  on PGlite and on the server for sync replay and MCP. Never write a second
  implementation of a journal query.
  - Journal code reaches the database, storage, images, configuration, and side
    effects only through `src/journal/platform/*`; time and UUIDs come from
    `@/journal/platform/clock`.
  - Register new modules in `src/journal/registry.ts`. Records that other
    records reference take identifiers from `allocateJournalIds`.
  - A journal write refreshes open pages itself; do not call
    `router.invalidate()` after one.
- Integrations and other server-only operations live in `src/lib/server/`:
  `.server.ts` files are internal modules, unsuffixed files export
  `createServerFn` boundaries.
- `src/lib/server/ai-runtime.server.ts`, database access, storage providers,
  and secrets are server-only. Never import them into browser code or expose
  non-`VITE_` environment variables to the client.
- Define and validate server variables in `src/lib/env.server.ts` and `VITE_`
  variables in `src/lib/env.ts`; read configuration from `process.env` or
  `import.meta.env` nowhere else.
- All private requests pass through the journal request boundary.
  - PostgreSQL: transaction-local identity and the restricted RLS role.
  - Journal functions stay portable to SQLite: explicit owner predicates,
    owner values, and composite owner foreign keys; never rely on an
    interactive transaction.
  - Related writes use `runJournalMutations` with compare-and-swap assertions
    in one atomic batch.
  - Reserve control access for authentication and account administration.
- With AUTH_ENABLED=false the default journal is shared; protect it with Hodor,
  an equivalent proxy, or a private network.

## Generated and stateful files

- Never edit `src/routeTree.gen.ts` manually. Run `bun run generate-routes`.
- Change `src/db/schema.ts` first, then run `bun run db:generate` and commit the
  generated migration and Drizzle metadata together.
- Use `bun run db:migrate` for committed migrations. `db:push` is only for
  disposable local databases.
- Treat uploads and database contents as user data. Do not delete, rewrite, or
  migrate them unless the task explicitly requires it.
- Put temporary browser screenshots and recordings under `.artifacts/qa/`.
  Never add browser automation dependencies or generated test artifacts.

## Commands

```bash
bun install --frozen-lockfile
bun run dev
bun run check
bun run typecheck
bun run test
bun run lint:deadcode
bun run build
bun run verify
```

Use `bun run test:integration` only with the required isolated PostgreSQL and
S3-compatible test services. It intentionally fails when their environment
variables are absent.

## Required verification

- Documentation/config-only change: `bun run check`; also validate the affected
  format, such as `docker compose config` or `helm lint charts`.
- TypeScript logic change: targeted tests, `bun run check`, and
  `bun run typecheck`.
- Route or UI behavior change: the TypeScript checks plus an ephemeral browser
  pass at 375px, 768px, and 1280px. Inspect console errors and failed requests.
- Schema/storage change: relevant unit and integration tests, migrations, and a
  production build.
- Before handoff of a broad change: `bun run verify`. CI additionally runs the
  integration services and deployment-config checks.

Do not claim integration or browser coverage when it was skipped or unavailable.

## UI rules

- Prefer existing shadcn/ui components; install a missing primitive with
  `bunx shadcn@latest add <component>`.
- Follow `DESIGN.md` for tokens, shared page widths, responsive behavior,
  accessibility, and dialog structure.
- Use Lucide icons and accessible names for icon-only controls.
- Preserve keyboard access, visible focus, 44px coarse-pointer targets, and
  intentional loading, empty, and error states.
- Use real links for navigation and semantic controls for actions.

## Implementation style

- Imports use the `@/` alias for `./src`.
- Files use kebab-case names; TanStack Router files (`$param.tsx`,
  `__root.tsx`) and generated files are the exception.
- "Brew" is the user-facing, URL, and database vocabulary (`brews` and
  `brew_*` tables); "shot" remains the internal TypeScript identifier.
  Measurement columns such as `shot_time_seconds` keep their physical names.
- Keep server functions thin: validate input at the boundary and delegate to a
  focused server/domain helper.
- Prefer inferred TanStack Router types; avoid casts that bypass route, search,
  or parameter validation.
- Reuse existing form-state, validation, image, storage, and error helpers before
  adding another abstraction.
- Preserve unrelated work in the shared worktree and keep changes scoped.

<!-- intent-skills:start -->
## TanStack references

Load the relevant reference with `npx @tanstack/intent@latest load <use>`.

```yaml
skills:
  - when: >-
      Set up or change TanStack Start, its root document, router factory,
      client/server entry points, or route generation.
    use: "@tanstack/start-client-core#start-core"
  - when: >-
      Implement or change createServerFn handlers, validation, redirects,
      errors, streaming, or FormData.
    use: "@tanstack/start-client-core#start-core/server-functions"
  - when: >-
      Change server/client boundaries, environment variables, ClientOnly
      behavior, or server-only modules.
    use: "@tanstack/start-client-core#start-core/execution-model"
  - when: "Change file routes, route trees, matching, or router registration."
    use: "@tanstack/router-core#router-core"
  - when: >-
      Change route loaders, pending/error states, cache behavior, or router
      invalidation.
    use: "@tanstack/router-core#router-core/data-loading"
  - when: "Change links, navigation, preloading, blockers, or scroll restoration."
    use: "@tanstack/router-core#router-core/navigation"
  - when: "Change validated search parameters or their serialization."
    use: "@tanstack/router-core#router-core/search-params"
  - when: "Change route typing, shared typed components, or route hook inference."
    use: "@tanstack/router-core#router-core/type-safety"
  - when: "Change Docker, Bun, Helm, or other TanStack Start deployment behavior."
    use: "@tanstack/start-client-core#start-core/deployment"
```
<!-- intent-skills:end -->
