# Roastbook

Roastbook is a self-hosted coffee journal for espresso shots, beans, recipes,
café visits, roasters, brewing methods, and gear.

It is built with Bun, TanStack Start and Router, React 19, shadcn/ui, Tailwind
CSS, PostgreSQL/Drizzle, and local or S3-compatible media storage. Optional
OpenAI-powered tools can extract information from images and research bean or
machine details.

## Features

- Log shots with recipe, dose, yield, time, equipment, and tasting data.
- Catalog beans, roasters, brewing methods, coffee shops, and gear.
- Track café visits and explore saved places on a map.
- Review activity, trends, and brewing statistics.
- Store media locally or in S3-compatible object storage.
- Gate self-hosted deployments with the Hodor reverse proxy.

## Quick start with Docker Compose

Docker Compose starts PostgreSQL, applies committed migrations, starts
Roastbook, and exposes it through Hodor.

```bash
cp .env.example .env
# Replace HODOR_PASSWORD and HODOR_SECRET in .env.
# Generate a signing secret with: openssl rand -hex 32
docker compose up --build
```

Open <http://localhost:3000> after the database migration completes.

## Local development

Roastbook uses Bun 1.3.14. With PostgreSQL available at the `DATABASE_URL` from
`.env`:

```bash
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

The unauthenticated development server listens on <http://localhost:3000>.
It applies pending migrations before accepting requests, repeats the check on
Vite configuration reloads, and watches for newly generated migrations while
running.

## Common commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Apply migrations and start the watched development server |
| `bun run check` | Check source formatting, lint, and Markdown |
| `bun run typecheck` | Run TypeScript without emitting files |
| `bun run test` | Run tests; report unavailable integrations as skipped |
| `bun run test:integration` | Require PostgreSQL and S3 integration tests |
| `bun run lint:deadcode` | Find unused code and dependencies with Knip |
| `bun run build` | Build production assets |
| `bun run verify` | Run the complete local quality gate |
| `bun run db:generate` | Generate a Drizzle migration after a schema change |
| `bun run db:migrate` | Apply committed migrations |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run db:seed` | Seed sample data |
| `bun run storage:orphans` | Report media drift without changing data |

## Documentation

- [Development and testing](docs/development.md)
- [Configuration reference](docs/configuration.md)
- [Docker, Helm, and security boundary](docs/deployment.md)
- [Design system and layout contract](DESIGN.md)
- [Helm chart reference](charts/README.md)

## Architecture at a glance

```text
src/routes/          TanStack Router file routes and server endpoints
src/components/      Shared application and domain UI
src/components/ui/   shadcn/ui primitives
src/lib/server/      Server-side domain operations
src/lib/storage/     Local and S3-compatible storage providers
src/db/              Drizzle schema and database connection
drizzle/             Committed migrations and metadata
charts/              Helm chart
```

`src/routeTree.gen.ts` is generated. Run `bun run generate-routes` instead of
editing it manually.

## License

[MIT](LICENSE)
