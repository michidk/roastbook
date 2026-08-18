# Roastbook

[![Checks and Build](https://github.com/michidk/roastbook/actions/workflows/ci.yml/badge.svg)](https://github.com/michidk/roastbook/actions/workflows/ci.yml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/dcbf6d1e94c244efaee4b19b86f2d771)](https://app.codacy.com/gh/michidk/roastbook/dashboard)

**The AI-native coffee journal you actually own.** Roastbook is a self-hosted
home for your coffee brews, beans, recipes, café visits, roasters, brewing
methods, and gear — and it fills itself in for you.

**[Try the read-only demo](https://roastbook.vercel.app)** — it runs entirely
from bundled sample data and requires no account or database.

Photograph a bag and Roastbook reads the label: origin, region, farm, variety,
process, roast level, roast date, tasting notes. Type a roaster's name and it
researches the website, location, and background. Add an espresso machine and it
looks up the documented factory defaults — brew pressure and OPV, pre-infusion
time and pressure, flow limit, volumetric dose, steam pressure — from manuals and
manufacturer documentation, so your brew log starts from real numbers instead of
guesses.

Logging coffee should take seconds, not minutes. Roastbook is built so the
tedious part — transcribing labels, hunting down specs, remembering what changed
between brews — happens for you, while every gram of your data stays on your own
infrastructure.

And it stays out of your way. Log a brew with dose, yield, and time and you are
done; the depth is there when you want it, not in your face when you don't.
Roastbook runs equally well on the phone in your hand at the machine and on the
desktop where you dig through the numbers afterwards.

## Why Roastbook

- **Simple first, deep when you ask.** Each brewing method shows only the fields
  that apply to it, so an espresso form is not a pour-over form. A quick entry
  takes three numbers.
- **Serious when you want to be.** Pre-infusion time and pressure, brew pressure,
  flow rate, brew temperature, grind setting, tamp force, basket, puck screen, and
  paper filter position per brew — plus documented machine-level OPV, factory
  pre-infusion, flow limit, and volumetric defaults on your gear.
- **Numbers that answer questions.** Filterable statistics connect brew quality
  to beans, methods, recipes, taste, consistency, timing, gear, and cost, while
  parameter charts show what a change to grind, dose, or pressure actually did.
- **Mobile and desktop, both first-class.** Large touch targets and compact cards
  next to the machine; full data tables, charts, and maps at the desk.
- **AI-native, not AI-bolted-on.** Research and extraction are wired into the
  forms you already use and return typed, validated fields you confirm before
  anything is saved.
- **Yours, end to end.** Self-hosted on your own PostgreSQL and your own storage,
  behind your own auth proxy. No accounts, no telemetry, no upsell.
- **A journal, not just a log.** Beans, roasters, gear, recipes, brewing methods,
  and café visits are linked, so every brew carries its whole story.
- **Deploys in one command.** Docker Compose for a home server, a Helm chart for
  a cluster.

### AI features

Set `OPENAI_API_KEY` and these turn on — everything else works without it:

- **Label scanning.** Extract full bean details from a photo of the bag.
- **Bean research.** Fill in origin, process, roast level, and tasting notes from
  the roaster's own sources.
- **Roaster research.** Resolve official website, Instagram, location, and a
  factual profile.
- **Machine research.** Pull documented factory espresso settings for your
  specific model, with strict rules against inferring values from similar
  machines.
- **Brew recommendations.** Analyze up to 50 brews for the same bean, method,
  and exact gear setup, then suggest a small evidence-grounded adjustment for
  the next brew.
- **Request debugging.** Review lifetime token usage and estimated token cost,
  then inspect every raw AI input, response event, error, and unparsed output
  from Settings.

Every AI call is optional, server-side only, rate-limited, schema-validated,
and recorded in PostgreSQL for local debugging. Raw logs include full image
payloads and remain inside the deployment's authentication boundary.

**On the roadmap: an MCP server**, so your own agents can read and write your
coffee log directly — ask what your last ten Gesha brews had in common, or have
an assistant log this morning's espresso for you.

## Features

- Log brews with recipe, dose, yield, time, equipment, overall and sensory
  ratings, and flavor notes; create recipes from scratch, duplicate variants,
  or reuse a brew’s values in a new or existing recipe.
- Catalog beans, roasters, brewing methods, coffee shops, and gear.
- Track café visits and explore saved places on a map.
- Review filterable brew and café trends, quality, consistency, taste, rhythm,
  exploration, recipe performance, gear usage, and costs.
- Scan labels and research beans, roasters, and machine settings with AI, with
  local request logs and token-cost estimates.
- Store media locally or in S3-compatible object storage.
- Gate self-hosted deployments with the Hodor reverse proxy.
- Explore a database-free, read-only demo backed by ephemeral PGlite seed data.

## Tech stack

A modern, boring-where-it-counts TypeScript stack with full-stack type safety
from the database row to the rendered field:

| Layer | Choice |
| --- | --- |
| Runtime and package manager | Bun 1.3.14 |
| Full-stack framework | TanStack Start with server functions |
| Routing | TanStack Router, file-based and fully typed |
| UI | React 19, shadcn/ui, Radix and Base UI, Tailwind CSS v4 |
| Icons and maps | Lucide, MapLibre GL |
| Database | PostgreSQL when self-hosted; ephemeral PGlite for the demo |
| Media storage | Local filesystem or any S3-compatible bucket |
| AI | TanStack AI with any OpenAI-compatible endpoint |
| Validation | Zod at every boundary, including environment variables |
| Tooling | Vite, Biome, Knip, `bun test` |
| Deployment | Docker Compose or Helm, fronted by the Hodor auth proxy |

Server-only concerns — database access, storage providers, AI calls, and secrets
— never cross into browser code, and configuration is validated at startup
instead of failing at request time.

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
| `bun run build:demo` | Build the database-free Vercel demo |
| `bun run verify` | Run the complete local quality gate |
| `bun run db:generate` | Generate a Drizzle migration after a schema change |
| `bun run db:migrate` | Apply committed migrations |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run db:seed` | Seed sample data |
| `bun run storage:orphans` | Report media drift without changing data |

## Documentation

- [Development and testing](docs/development.md)
- [Configuration reference](docs/configuration.md)
- [Read-only demo mode](docs/demo-mode.md)
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
