# Roastbook designs

`views/roastbook.fig` is an [OpenPencil](https://openpencil.dev) document of
every Roastbook view, captured from a running instance with seed data (lists cut
to six items).

- **Pages:** Cover, one page per view with desktop (1440×900) and mobile
  (390×844, touch, so 44 px targets apply) artboards, then Components,
  Primitives and Icons. Tall views grow their artboard, with a guide at the
  screen edge.
- **Layout:** auto layout throughout; CSS grids become grid layouts and
  positioned elements become constrained absolute children.
- **Components:** Lucide icons and shared React components that repeat become
  components whose description names the source file and line. Variants use
  `data-variant`/`data-size`, then `Breakpoint`, `Fill`, and `Layout=n` last.
- **Variables:** colours from `src/styles.css` with Light and Dark modes, plus
  spacing, radius and font families, each with its CSS as Web code syntax.
  Bindings exist only where both themes used the token or the value is on a
  scale.
- **Styles:** text styles follow the type scale in `DESIGN.md`; effect styles
  hold the shadows.
- **Layers** are named `<role> · <component file>` (for example
  `page-header · page-layout`); bare containers are `Row`, `Stack`, `Grid` or
  `Layers`.

`tokens/` holds the same tokens as W3C design token (DTCG) files: one folder per
collection, one file per mode, and `styles.tokens.json` for typography and
shadows. Any DTCG tool, including OpenPencil's `import_design_tokens`, loads
them.

## Capture

Start Roastbook with seed data (see `docs/development.md`), then:

```bash
cd design
bun install
bunx playwright-core install chromium-headless-shell
ROASTBOOK_URL=http://localhost:3000 bun capture.ts
```

Options: `VIEWS="Beans,Bean"` captures only those views, `CDP_URL` uses a
remote Chrome, `OUTPUT` changes the target file, and `LIST_LIMIT` in
`capture.ts` sets the list cut. A capture replaces the document and `tokens/`,
so commit design edits first.

Steps in `capture/`: `snapshot.ts` (measure the page in both themes),
`build.ts` (layers), `verify.ts` (re-lay out with OpenPencil's text measurement;
mismatching frames fall back to fixed positions), `tokens.ts` (tokens and
bindings), `components.ts` (components and instances).

Not captured: pseudo-elements, hover/focus states, open menus or dialogs, CSS
transforms (Stats chart labels sit at fixed positions) and transitions.

## Editor and agents

`open-pencil/editor.sh setup` clones and builds OpenPencil;
`open-pencil/editor.sh start` serves a development build (required for the MCP
bridge) against `views/`, using `vite.vibepod.config.ts`. It needs
`OPENPENCIL_DEV_ORIGIN` (the editor's public origin) and reads its MCP token
from `OPENPENCIL_TOKEN_FILE`. The token is embedded in the bundle, so serve the
editor only behind authentication. `/` opens `views/roastbook.fig`.

Agents connect through OpenPencil's stdio MCP server
(`packages/mcp/src/stdio.ts`), with `OPENPENCIL_MCP_DISCOVERY_PATH` set to the
editor's discovery file and `OPENPENCIL_MCP_ROOT` set to `design/views`. Then:

- call `open_file` with `roastbook.fig` and pass each page's `page_id` (from
  `list_pages`) to every tool; `switch_page` does not retarget later calls;
- reopen the document after visiting many pages: edits are refused once loaded
  pages exceed 10,000 nodes (the document has about 21,000);
- the browser cannot write to `views/` (**File → Save** downloads); without an
  open tab, edit the file with `bun open-pencil eval <file> --write -c '…'`
  from the OpenPencil checkout.
