<!-- markdownlint-disable MD033 -->
<h1 align="center">
  <img src="public/navbar-logo.png" alt="" width="64" height="64"><br>
  Roastbook
</h1>

<p align="center">
  <strong>The AI-native coffee journal you actually own.</strong><br>
  Photograph the bag. Log the brew. Keep every gram of data on your own
  infrastructure.
</p>

<p align="center">
  <a href="https://roastbook.vercel.app/"><b>Live demo</b></a>
  &nbsp;·&nbsp;
  <a href="#-quick-start">Quick start</a>
  &nbsp;·&nbsp;
  <a href="#-documentation">Documentation</a>
  &nbsp;·&nbsp;
  <a href="DESIGN.md">Design system</a>
</p>

<p align="center">
<a href="https://github.com/michidk/roastbook/actions/workflows/ci.yml">
<img alt="Checks and Build" src="https://github.com/michidk/roastbook/actions/workflows/ci.yml/badge.svg"></a>
<a href="https://app.codacy.com/gh/michidk/roastbook/dashboard">
<img alt="Codacy grade" src="https://app.codacy.com/project/badge/Grade/dcbf6d1e94c244efaee4b19b86f2d771"></a>
<img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg">
<img alt="Self-hosted" src="https://img.shields.io/badge/self--hosted-yes-8B5E34.svg">
</p>

---

> [!TIP]
> **Try it in ten seconds.** The
> [read-only demo](https://roastbook.vercel.app/) runs entirely from bundled
> sample data — no account, no database, nothing to install.

## ☕ What it is

Roastbook is a self-hosted home for your brews, beans, recipes, café visits,
roasters, brewing methods, and gear — and it fills itself in for you.

- 📷 **Photograph a bag** and Roastbook reads the label: origin, region, farm,
  variety, process, roast level, roast date, tasting notes.
- 🔎 **Type a roaster's name** and it researches the website, location, and
  background.
- ⚙️ **Add an espresso machine** and it looks up documented capabilities and
  factory defaults from exact-model manuals and manufacturer sources.

Every accepted value keeps its source, and factory facts stay separate from
your current setup.

Logging coffee should take seconds, not minutes. Log a brew with dose, yield,
and time and you are done; the depth is there when you want it, not in your
face when you don't. Roastbook runs equally well on the phone in your hand at
the machine and on the desktop where you dig through the numbers afterwards.

## ✨ Why Roastbook

- 🎚️ **Simple first, deep when you ask.** Each brewing method shows only the
  fields that apply to it, so an espresso form is not a pour-over form. A quick
  entry takes three numbers.
- 🔬 **Serious when you want to be.** Pre-infusion time and pressure, brew
  pressure, flow rate, brew temperature, grind setting, tamp force, basket,
  puck screen, and paper filter position per brew — plus typed capabilities for
  each equipment type and revisioned espresso-machine settings that preserve
  old brew context.
- 📈 **Numbers that answer questions.** A year-long coffee activity calendar and
  filterable statistics connect brew quality to beans, methods, taste,
  consistency, timing, gear, and cost, while parameter charts show what a change
  to grind, dose, or pressure actually did.
- 📱 **Mobile and desktop, both first-class.** Large touch targets and compact
  cards next to the machine; full data tables, charts, and maps at the desk,
  plus a <kbd>⌘</kbd> <kbd>K</kbd> command palette for jumping anywhere without
  the mouse.
- 🤖 **AI-native, not AI-bolted-on.** Research and extraction are wired into the
  forms you already use and return typed, validated fields you confirm before
  anything is saved.
- 🔒 **Yours, end to end.** Self-hosted on your own PostgreSQL and your own
  storage, behind your own auth proxy. No accounts, no telemetry, no upsell.
- 📓 **A journal, not just a log.** Beans, roasters, gear, recipe templates,
  brewing methods, and café visits keep every brew's full story structured.
- 🚀 **Deploys in one command.** Docker Compose for a home server, a Helm chart
  for a cluster.

## 🧠 AI features

> [!NOTE]
> Set `OPENAI_API_KEY` and these turn on. Everything else works without it.

- **Label scanning** — extract full bean details from a photo of the bag.
- **Bean research** — fill in origin, process, roast level, and tasting notes
  from the roaster's own sources.
- **Roaster research** — resolve official website, Instagram, location, and a
  factual profile.
- **Machine research** — pull sourced capabilities and factory espresso settings
  for your specific model, with strict rules against weak evidence, pump-rating
  guesses, or values from similar machines.
- **Brew recommendations** — compare a new-brew draft or one specific logged
  brew with up to 50 brews for the same bean, method, and exact gear setup, then
  get a confidence-rated opinion that recognizes when recent brews are already
  good, or proposes one explained adjustment or controlled experiment.
- **Request debugging** — review lifetime token usage and estimated token cost,
  then inspect every raw AI input, response event, error, and unparsed output
  from Settings.

Every AI call is optional, server-side only, rate-limited, schema-validated,
and recorded in PostgreSQL for local debugging. Image logs retain metadata such
as MIME type and byte count, not the image payload itself.

> [!IMPORTANT]
> **On the roadmap: an MCP server**, so your own agents can read and write your
> coffee log directly — ask what your last ten Gesha brews had in common, or
> have an assistant log this morning's espresso for you.

## 📦 Features

<details>
<summary><b>The complete feature list</b></summary>

### Brewing

- Log brews with dose, yield, time, equipment, overall and sensory ratings, and
  flavor notes.
- Load a recipe as editable template values, create recipes from scratch,
  duplicate variants, or reuse a brew's values in a new or existing recipe.
  Brews keep their own snapshot and are never linked back to the template.
- A recipe can set a target brew time, which the brew timer then counts against.

### Taste

- Tailor the taste profile in settings: switch the overall rating, each sensory
  factor, flavor tags, and tasting notes on or off. Disabled inputs disappear
  from rating forms and from every place they were shown.
- Or pick the simple taste profile, which replaces the individual factors with
  one sour-to-bitter scale — sour points at under-extraction and bitter at
  over-extraction, the usual first dial-in move.

### Your coffee world

- Catalog beans, roasters, brewing methods, coffee shops, and typed gear
  details, and group equipment into reusable gear sets that fill new brew and
  recipe equipment fields in one tap.
- Track café visits and explore visited locations on a map.
- Configure drink and milk types in Settings, assign drink types to brewing
  methods to keep new-brew choices relevant, then record the finished drink and
  its applicable milk choice on both brews and café visits.
- Keep a Places list of saved cafés, from favorites to a want-to-visit wishlist.

### Insight

- Review filterable brew and café trends, quality, consistency, taste, rhythm,
  exploration, recipe performance, gear usage, and costs.
- Scan labels and research beans, roasters, and sourced machine properties with
  AI, with local request logs and token-cost estimates.

### Getting around

- Search beans, cafés, and gear directly; jump to any page; start a new brew,
  bean, or visit; and switch theme from the command palette (<kbd>⌘</kbd>
  <kbd>K</kbd> or <kbd>Ctrl</kbd> <kbd>K</kbd>).

### Self-hosting

- Store media locally or in S3-compatible object storage.
- Gate self-hosted deployments with the Hodor reverse proxy.
- Explore a database-free, read-only demo backed by ephemeral PGlite seed data.

</details>

## 🧱 Tech stack

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
— never cross into browser code, and configuration is validated lazily on first
use, reporting the affected variable names.

## 🚀 Quick start

Docker Compose starts PostgreSQL, applies committed migrations, starts
Roastbook, and exposes it through Hodor.

```bash
cp .env.example .env
# Replace HODOR_PASSWORD and HODOR_SECRET in .env.
# Generate a signing secret with: openssl rand -hex 32
docker compose up --build
```

Open <http://localhost:3000> after the database migration completes.

## 🔧 Local development

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

<details>
<summary><b>All available commands</b></summary>

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
| `bun run db:seed` | Seed the same fictional dataset as the public demo |
| `bun run storage:orphans` | Report media drift without changing data |

</details>

## 📚 Documentation

| Guide | What is inside |
| --- | --- |
| [Development and testing](docs/development.md) | Workflow, tests, tooling |
| [Configuration reference](docs/configuration.md) | Every environment variable |
| [Read-only demo mode](docs/demo-mode.md) | How the PGlite demo is built |
| [Deployment](docs/deployment.md) | Docker, Helm, security boundary |
| [Design system](DESIGN.md) | Layout contract and UI conventions |
| [Helm chart reference](charts/README.md) | Chart values and defaults |

## 📁 Project layout

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

> [!WARNING]
> `src/routeTree.gen.ts` is generated. Run `bun run generate-routes` instead of
> editing it manually.

## 📄 License

[MIT](LICENSE)

---

<p align="center">
  Open-source software for people who care about coffee. ☕<br>
  <sub><a href="https://roastbook.vercel.app/">Try the demo</a> ·
  <a href="https://github.com/michidk/roastbook">Star it on GitHub</a></sub>
</p>
