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
  <a href="https://demo.roastbook.coffee/overview"><b>Open the demo</b></a>
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

<p align="center">
  <a href="https://roastbook.coffee/">
    <img src="public/media/roastbook-coffee-journal.webp"
      alt="A saved Roastbook coffee recipe beside an espresso setup"
      width="1000">
  </a><br>
  <sub>Real app screen with sample data, set in an AI-generated coffee scene.</sub>
</p>

---

> [!TIP]
> **Try it in ten seconds.** The
> [editable demo](https://demo.roastbook.coffee/overview) starts with fictional
> sample data. Changes and pictures stay in this browser, without an account or
> server database. They do not sync and disappear if site storage is cleared.

The public website is [roastbook.coffee](https://roastbook.coffee/). This repository
serves the browser-local demo, the self-hosted journal, and a Cloudflare Workers
runtime for managed hosting. Hosted infrastructure stays in a separate private
repository; this does not change the self-hosted installation. Hosted automation
deploys successful main builds to staging and published
GitHub releases to production. PR previews require a contributor with write access
or a `preview` label applied by someone with that access.

## ☕ What it is

Roastbook is a self-hosted home for your brews, beans, recipes, café visits,
roasters, brewing methods, and gear — and it fills itself in for you.

<p align="center">
  <img src=".github/images/overview-desktop.png"
    alt="Roastbook overview with recent brews and quick actions"
    width="1200">
</p>

- 📷 **Photograph a bag** and Roastbook reads the label: origin, region, farm,
  variety, altitude, process, roast level, decaf, roast date, tasting notes.
- 🔎 **Type a roaster's name** and it researches the website, location, and
  background.
- ⚙️ **Add an espresso machine** and it looks up documented capabilities and
  factory defaults from exact-model manuals and manufacturer sources.

Every accepted value keeps its source, and factory facts stay separate from
your current setup.

Logging coffee should take seconds, not minutes. Log a brew with dose, yield,
and time and you are done; the depth is there when you want it, not in your
face when you don't.

<p align="center">
  <img src=".github/images/new-brew-desktop.png"
    alt="Logging a new espresso brew with method suggestions, taste controls,
    a selected coffee, and the brew timer"
    width="900">
</p>

Roastbook is designed for desktop first, with full support for phones and
tablets. Use the browser or install it as a Progressive Web App (PWA) on your
phone or desktop. Your journal lives in the browser and syncs with your account,
so after the first download every journal page works without a connection, then
syncs when you reconnect.
[See what works offline.](docs/offline.md)

Choose your look in **Settings → Appearance**: three light palettes and three
dark palettes, each with a live miniature preview. Light Roast and Dark Roast
are the defaults. Palettes, coffee stains, and background grain save to your
local journal and sync across devices in the product. Only the Light, Dark, or System
color-mode choice stays on this device. The header switch uses your saved
palettes. The Roast pair keeps
paper grain and coffee-ring backgrounds, with separate controls for each.
Classic Light and Classic Dark use
ivory and charcoal with copper accents. Pure Light and Pure Dark offer minimal
white and black styling without textures.

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
- 🫘 **One coffee, every bag.** Buying the same beans again adds a new bag to
  the existing coffee profile, prefilled with the weight, price, and shop of the
  latest bag. Roast date, starting weight, price, shop (name and optional URL),
  shelf state, and remaining-weight estimates stay bag-specific, while brew
  history and AI recommendations learn across every purchase of that coffee.
  Edit an existing bag to update its roast and purchase details. Pictures
  belong to the coffee, not the bag, so every bag shows the same photos.
- 📱 **Desktop first, fully mobile-friendly.** Full data tables, charts, and
  maps at the desk, with a <kbd>⌘</kbd> <kbd>K</kbd> command palette for keyboard
  navigation. Responsive layouts, large touch targets, and compact cards
  support phones and tablets next to the coffee machine.
- 📴 **An installable app that works offline.** Install Roastbook as a PWA on
  your phone or desktop. Your whole journal runs locally, works without a
  connection, and syncs when you reconnect.
  [See what works offline.](docs/offline.md)
- 🤖 **AI-native, not AI-bolted-on.** Research and extraction are wired into the
  forms you already use and return typed, validated fields you confirm before
  anything is saved.
- 🔒 **Yours, end to end.** Self-hosted on your own PostgreSQL and your own
  storage. Use private accounts with email codes and passkeys, or a shared
  journal behind your own auth proxy. Branded emails include a sign-in code and
  an encrypted link that keeps your email address out of the URL. After email
  sign-in, an optional prompt helps you add a passkey for next time. Your header
  avatar uses Gravatar with
  an initials fallback and opens account settings and sign-out controls.
  Demo and shared journals show a matching avatar menu for the demo user or
  default user. Every avatar menu includes Settings and a System, Light, or Dark
  theme submenu; account controls appear when authentication is enabled.
- 📓 **A journal, not just a log.** Beans, roasters, gear, recipe templates,
  brewing methods, and café visits keep every brew's full story structured.
- 🚀 **Deploys in one command.** Docker Compose for a home server, a Helm chart
  for a cluster.

## 🧠 AI features

> [!NOTE]
> Choose provided AI or BYOAI in Settings > AI. When enabled by your operator,
> provided AI includes 10 free requests per week, resetting Monday at 00:00 UTC.
> Administrators can adjust each user's allowance and review instance AI costs.

Administrators use a dedicated Admin page with the same section navigation as
Settings. Its Users table shows account roles, last sign-in, journal counts,
and free AI usage when provided AI is enabled. Row actions manage administrator
access, weekly allowances, and confirmed account deletion.
> BYOAI uses your own endpoint and key, billed by your provider.
> The free tier appears only with authentication enabled and an operator key in
> environment variables, including existing `OPENAI_*` configuration. Otherwise,
> users connect their own provider.
> Self-hosted operators configure `AI_CREDENTIAL_ENCRYPTION_KEY` for BYOAI; see
> [AI configuration](docs/configuration.md#openai-compatible-ai). Everything else
> works without AI.

- **Label scanning** — extract bean details from up to six pictures of the bag
  together, using one analysis when adding or editing a coffee.
- **Bean research** — fill in origin, process, roast level, and tasting notes
  from the roaster's own sources.
- **Roaster research** — resolve official website, Instagram, location, and a
  factual profile.
- **Machine research** — pull sourced capabilities and factory espresso settings
  for your specific model, with strict rules against weak evidence, pump-rating
  guesses, or values from similar machines.
- **Brew recommendations** — compare a new-brew draft or one specific logged
  brew with up to 50 brews for the same bean, method, and exact gear setup, then
  choose a historical brew type and equipment setup when beans have multiple
  combinations, with the latest brew preselected. Only matching history is
  used to get a confidence-rated opinion that recognizes when recent brews
  are already good, or proposes one explained adjustment or controlled
  experiment. The
  prompt accounts for human entry errors and subjective taste-profile outliers,
  and favors bean-appropriate classic starting recipes for unbrewed drafts
  without reliable matching taste evidence. The recommendation also
  suggests three follow-up questions that open a chat beside it, where you can
  ask, for example, whether another setting such as the grind could help.
  Answers reuse the recommendation's blocks, with parameter chips, change cards,
  and keep-constant cards; the conversation is not saved.
- **Request debugging** — review lifetime token usage and estimated token cost,
  then inspect every raw AI input, response event, error, and unparsed output
  from Settings.

<p align="center">
  <img src=".github/images/ai-opinion-desktop.png"
    alt="AI opinion on a logged brew with a confidence rating, a comparison
    with earlier brews, and a follow-up chat"
    width="1000">
</p>

Every AI call is optional, server-side only, rate-limited, schema-validated,
and recorded in PostgreSQL for local debugging. Image logs retain metadata such
as MIME type and byte count, not the image payload itself.

> [!IMPORTANT]
> **MCP server for your own agents.** `/api/mcp` is a stateless Streamable HTTP
> endpoint (protocol 2026-07-28) with ten read tools and one write tool
> (`create_brew`; nothing deletes or edits data). Ask what your last ten Gesha
> brews had in common, or have an assistant log this morning's espresso. It has
> browser sign-in and scoped OAuth consent with private accounts, plus manual
> tokens for shared installations and other clients. Manage connections and
> tokens in Settings > AI access (MCP). Keep device endpoints private when
> public access is unnecessary. See [MCP deployment](docs/deployment.md#mcp).

## 📦 Features

<details>
<summary><b>The complete feature list</b></summary>

### Brewing

- Log brews with dose, yield, time, equipment, overall and sensory ratings, and
  flavor notes.
- Load a recipe as editable template values, create recipes from scratch,
  duplicate variants, or reuse a brew's values in a new or existing recipe.
  Brews keep their own snapshot and are never linked back to the template.
- Recipes preserve drink options such as milk type. Loading a recipe also
  selects a gear set when its equipment matches.
- A recipe can set a target brew time, which the brew timer then counts against.
- Optionally receive brew times from a Wi-Fi
  [shottimer](https://github.com/michidk/shottimer) and share the target time
  with it.

### Taste

- Tailor the taste profile in settings: switch the overall rating, each sensory
  factor, flavor tags, and tasting notes on or off. Disabled inputs disappear
  from rating forms and from every place they were shown.
- Or pick the simple taste profile, which replaces the individual factors with
  one sour-to-bitter scale — sour points at under-extraction and bitter at
  over-extraction, the usual first dial-in move.

### Your coffee world

- Catalog coffees with repeat-purchase bag history, roasters, brewing methods,
  coffee shops, and typed gear
  details, and group equipment into reusable gear sets that fill new brew and
  recipe equipment fields in one tap.
- Track café visits and explore visited locations on a map.
- Configure drink and milk types in Settings, assign drink types to brewing
  methods to keep new-brew choices relevant, then record the finished drink and
  its applicable milk choice on both brews and café visits.
- Keep a Places list of saved cafés, from favorites to a want-to-visit wishlist.

<p align="center">
  <img src=".github/images/beans-desktop.png"
    alt="Roastbook bean collection with coffee bags on the shelf"
    width="1200">
</p>

### Insight

- Review filterable brew and café trends, quality, consistency, taste, rhythm,
  exploration, recipe performance, gear usage, and costs.
- Scan labels and research beans, roasters, and sourced machine properties with
  AI, with local request logs and token-cost estimates.

### Getting around

- Search beans, cafés, and gear directly; jump to any page; start a new brew,
  bean, or visit; and switch theme from the command palette (<kbd>⌘</kbd>
  <kbd>K</kbd> or <kbd>Ctrl</kbd> <kbd>K</kbd>).
- Install Roastbook as a PWA on your phone or desktop. Read and edit your
  journal, attach pictures, and review changes that need attention offline;
  everything stays on the device and syncs when you reconnect.

### Self-hosting

- Store media locally or in S3-compatible object storage.
- Choose built-in passwordless accounts with private journals, or one shared
  journal behind the optional Hodor reverse proxy.
- Track compressed image storage per journal, with three pictures per item and
  a configurable storage allowance.
- Manage users, export data and stored images, and confirm account deletion
  through email.
- Explore an editable demo that runs the full journal in the visitor's browser.

</details>

## 🧱 Tech stack

A modern, boring-where-it-counts TypeScript stack with full-stack type safety
from the database row to the rendered field:

| Layer | Choice |
| --- | --- |
| Runtime and package manager | Bun 1.4.4 |
| Full-stack framework | TanStack Start with server functions |
| Routing | TanStack Router, file-based and fully typed |
| UI | React 19, shadcn/ui, Radix and Base UI, Tailwind CSS v4 |
| Icons and maps | Lucide, MapLibre GL |
| Database | PostgreSQL or hosted Cloudflare D1; PGlite in the browser |
| Media storage | Local filesystem, S3-compatible buckets, hosted R2 |
| AI | TanStack AI with any OpenAI-compatible endpoint |
| Validation | Zod at every boundary, including environment variables |
| Local journal | Shared SQL journal functions on PGlite, synced by replay |
| PWA | Web app manifest and a hand-written service worker |
| Tooling | Vite, Biome, Knip, `bun test` |
| Authentication | Better Auth 1.7, email codes and passkeys; optional Hodor |
| Deployment | Docker Compose or Helm, optional account worker |

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

For private accounts, configure `AUTH_URL`, `AUTH_SECRET`, and email delivery in
`.env`, then use `docker compose -f docker-compose.auth.yaml up --build`. This
example includes the export/deletion worker and does not require Hodor. The
first verified self-hosted user becomes administrator and claims the journal.
See [authentication configuration](docs/configuration.md#authentication-and-email)
and [upgrade instructions](docs/deployment.md#upgrading-an-existing-journal)
before enabling accounts on an existing installation.

## 🔧 Local development

Roastbook uses Bun 1.4.4. With PostgreSQL available at the `DATABASE_URL` from
`.env`:

```bash
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Run `bun run storybook` to browse the reusable UI library, including journal
cards, brewing and tasting inputs, charts, dialogs, and form states. See
[Component stories](docs/development.md#component-stories) for coverage and
service boundaries.

The development server listens on <http://localhost:3000>. Authentication is
controlled by `AUTH_ENABLED`, with the same request boundary as production.
It applies pending migrations before accepting requests, repeats the check on
Vite configuration reloads, and watches for newly generated migrations while
running.

<details>
<summary><b>All available commands</b></summary>

| Command | Purpose |
| --- | --- |
| `bun run dev` | Apply migrations and start the watched development server |
| `bun run storybook` | Browse interactive component stories on port 6006 |
| `bun run build:storybook` | Build the static component library |
| `bun run check` | Check source formatting, lint, and Markdown |
| `bun run typecheck` | Run TypeScript without emitting files |
| `bun run test` | Run tests; report unavailable integrations as skipped |
| `bun run test:integration` | Require PostgreSQL and S3 integration tests |
| `bun run lint:deadcode` | Find unused code and dependencies with Knip |
| `bun run build` | Build production assets |
| `bun run dev:demo` | Prepare and run the browser-local demo |
| `bun run build:demo` | Build the browser-local Vercel demo |
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
| [Browser-local demo](docs/demo-mode.md) | Local persistence, reset, restrictions, and builds |
| [Offline journaling](docs/offline.md) | Local journal coverage, conflicts, and sync |
| [Journal architecture](docs/client-data.md) | Journal functions, local database, and sync |
| [Deployment](docs/deployment.md) | Docker, Helm, security boundary |
| [Cloudflare runtime](docs/cloudflare-runtime.md) | Workers Free target, D1, R2, private Resend relay, hosted security boundary |
| [Shottimer API](docs/shottimer.md) | Device integration endpoints |
| [Design system](DESIGN.md) | Layout contract and UI conventions |
| [Design files](design/README.md) | Editable OpenPencil views and editor |
| [Instagram campaign studio](marketing/README.md) | Demo captures, AI scenes, carousel and video exports |
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
  <sub><a href="https://demo.roastbook.coffee/overview">Try the demo</a> ·
  <a href="https://github.com/michidk/roastbook">Star it on GitHub</a></sub>
</p>

Installed PWA apps show a connection indicator beside the theme switcher. Open it
to view PWA settings, queued changes, sync status, and local storage controls.
AI integrations remain available while the installed app is online.
