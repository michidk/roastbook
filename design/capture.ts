// Captures every Roastbook view from a running instance into one OpenPencil
// document, views/roastbook.fig: a page per view with its desktop and mobile
// artboards, the app's tokens as variables and styles, and repeated layers as
// components. See README.md for what each step does.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { populateFigPage } from '@open-pencil/core/io/formats/fig'
import { prepareGraphFonts } from '@open-pencil/core/text'
import { SceneGraph, type SceneNode } from '@open-pencil/scene-graph'
import { chromium, type Page } from 'playwright-core'
import { SceneBuilder } from './capture/build'
import { extractComponents } from './capture/components'
import {
  type Box,
  ELEMENT_PROPS,
  type SnapshotElement,
  snapshotPage,
  TEXT_PROPS,
  trimRepeats,
} from './capture/snapshot'
import {
  importTokens,
  parseTheme,
  StyleMatcher,
  ThemeBinder,
  type TokenFile,
  typographyTokenFile,
  variableTokenFiles,
} from './capture/tokens'
import { checkLayout } from './capture/verify'

const APP_URL = process.env.ROASTBOOK_URL ?? 'http://localhost:3000'
// Optional remote Chrome (for example a chromedp/headless-shell container).
const CDP_URL = process.env.CDP_URL
const OUTPUT = process.env.OUTPUT ?? 'views/roastbook.fig'
const TOKENS_DIR = 'tokens'
const ONLY = process.env.VIEWS?.split(',')

// Common device sizes; a page taller than the screen grows its artboard to fit.
const VIEWPORTS = [
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'Mobile', width: 390, height: 844 },
]
// Seed data lists dozens of records; a design shows the pattern with a few.
const LIST_LIMIT = 6
const ARTBOARD_GAP = 160

// `detail` opens the first entry linked from `path` instead of `path` itself.
const VIEWS: { name: string; path: string; detail?: RegExp }[] = [
  { name: 'Overview', path: '/overview' },
  { name: 'Brews', path: '/brews' },
  { name: 'Brew', path: '/brews', detail: /^\/brews\/(?!new)[^/]+$/ },
  { name: 'New brew', path: '/brews/new' },
  { name: 'Beans', path: '/beans' },
  { name: 'Bean', path: '/beans', detail: /^\/beans\/(?!new)[^/]+$/ },
  { name: 'New bean', path: '/beans/new' },
  { name: 'Roasters', path: '/roasters' },
  { name: 'Roaster', path: '/roasters', detail: /^\/roasters\/(?!new)[^/]+$/ },
  { name: 'New roaster', path: '/roasters/new' },
  { name: 'Recipes', path: '/recipes' },
  { name: 'Recipe', path: '/recipes', detail: /^\/recipes\/(?!new)[^/]+$/ },
  { name: 'New recipe', path: '/recipes/new' },
  { name: 'Brewing methods', path: '/brewing-methods' },
  {
    name: 'Brewing method',
    path: '/brewing-methods',
    detail: /^\/brewing-methods\/(?!new)[^/]+$/,
  },
  { name: 'New brewing method', path: '/brewing-methods/new' },
  { name: 'Gear', path: '/gear' },
  { name: 'Gear item', path: '/gear', detail: /^\/gear\/(?!new)[^/]+$/ },
  { name: 'New gear', path: '/gear/new' },
  { name: 'Gear sets', path: '/gear-sets' },
  {
    name: 'Gear set',
    path: '/gear-sets',
    detail: /^\/gear-sets\/(?!new)[^/]+$/,
  },
  { name: 'New gear set', path: '/gear-sets/new' },
  { name: 'Places', path: '/places' },
  { name: 'Place', path: '/places', detail: /^\/places\/(?!new)[^/]+$/ },
  { name: 'New place', path: '/places/new' },
  { name: 'Visits', path: '/visits' },
  { name: 'Visit', path: '/visits', detail: /^\/visits\/(?!new)[^/]+$/ },
  { name: 'New visit', path: '/visits/new' },
  { name: 'Stats', path: '/stats' },
  { name: 'Settings', path: '/settings' },
  { name: 'Settings — Appearance', path: '/settings/appearance' },
  { name: 'Settings — Map', path: '/settings/map' },
  { name: 'Settings — Drinks', path: '/settings/drinks' },
  { name: 'Settings — Taste profile', path: '/settings/taste-profile' },
  { name: 'Settings — AI', path: '/settings/ai' },
  { name: 'Settings — Shot timer', path: '/settings/shottimer' },
  { name: 'Settings — Storage', path: '/settings/storage' },
  { name: 'Settings — About', path: '/settings/about' },
]

// Measuring has to see the page at rest, in the font instances OpenPencil renders.
const CAPTURE_CSS =
  '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important }'

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

// The app scrolls inside #app-scroll-area, so grow the viewport to its content
// height to capture the whole view.
async function fitToContent(page: Page, width: number) {
  for (let i = 0; i < 4; i++) {
    const overflow = await page.evaluate(() => {
      const area = document.querySelector('#app-scroll-area')
      return area ? area.scrollHeight - area.clientHeight : 0
    })
    if (overflow <= 1) return
    const { height } = page.viewportSize() ?? { height: 800 }
    await page.setViewportSize({
      width,
      height: Math.min(height + overflow, 12000),
    })
    await settle(page)
  }
}

async function snapshotView(
  page: Page,
  view: (typeof VIEWS)[number],
  viewport: (typeof VIEWPORTS)[number],
) {
  await page.setViewportSize(viewport)
  await page.goto(new URL(view.path, APP_URL).href)
  await settle(page)
  if (view.detail) {
    const pattern = view.detail
    const hrefs = await page.$$eval('a[href]', (links) =>
      links.map((link) => link.getAttribute('href') ?? ''),
    )
    const href = hrefs.find((candidate) => pattern.test(candidate))
    if (!href) return null
    await page.goto(new URL(href, APP_URL).href)
    await settle(page)
  }
  await page.addStyleTag({ content: CAPTURE_CSS })
  await page.evaluate(trimRepeats, LIST_LIMIT)
  await fitToContent(page, viewport.width)
  return page.evaluate(snapshotPage, {
    element: ELEMENT_PROPS,
    text: TEXT_PROPS,
  })
}

function buildValidatedUrl(baseUrl: string): string {
  try {
    if (baseUrl.includes('/../') || /\/%2e%2e\//i.test(baseUrl)) {
      throw new Error('Invalid path')
    }
    const url = new URL(baseUrl)
    const allowedDomains = ['localhost']
    if (!allowedDomains.includes(url.hostname)) {
      throw new Error('Invalid host')
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol')
    }
    return url.href
  } catch {
    throw new Error('Invalid URL')
  }
}

const imageCache = new Map<string, Promise<Uint8Array | null>>()
function loadImage(url: string) {
  let cached = imageCache.get(url)
  if (!cached) {
    cached = url.startsWith('data:')
      ? Promise.resolve(
          new Uint8Array(
            Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'),
          ),
        )
      : Promise.resolve()
          .then(() => fetch(buildValidatedUrl(url)))
          .then(async (response) =>
            response.ok ? new Uint8Array(await response.arrayBuffer()) : null,
          )
          .catch(() => null)
    imageCache.set(url, cached)
  }
  return cached
}

/** The first page: what the document is, where it comes from, and how it is laid out. */
async function cover(
  graph: SceneGraph,
  pageId: string,
  views: number,
  components: { components: number },
) {
  graph.updateNode(pageId, { name: 'Cover' })
  const frame = graph.createNode('FRAME', pageId, {
    name: 'Cover',
    width: 1440,
    height: 900,
    layoutMode: 'VERTICAL',
    itemSpacing: 40,
    paddingTop: 120,
    paddingLeft: 120,
    paddingRight: 120,
    primaryAxisSizing: 'FIXED',
    counterAxisSizing: 'FIXED',
    fills: [
      {
        type: 'SOLID',
        color: { r: 0.965, g: 0.929, b: 0.875, a: 1 },
        opacity: 1,
        visible: true,
      },
    ],
  })
  const ink = [
    {
      type: 'SOLID' as const,
      color: { r: 0.227, g: 0.165, b: 0.118, a: 1 },
      opacity: 1,
      visible: true,
    },
  ]
  const line = (
    text: string,
    fontSize: number,
    fontWeight: number,
    fontFamily = 'Hanken Grotesk',
  ) =>
    graph.createNode('TEXT', frame.id, {
      name: text.slice(0, 40),
      text,
      fontFamily,
      fontSize,
      fontWeight,
      lineHeight: Math.round(fontSize * 1.3),
      fills: ink,
      textAutoResize: 'HEIGHT',
      layoutAlignSelf: 'STRETCH',
      width: 1200,
      height: fontSize,
    })
  line('Roastbook', 128, 800, 'Bricolage Grotesque')
  line(
    'Every view of the app, desktop (1440×900) and mobile (390×844), with its tokens and components.',
    48,
    500,
  )
  line(
    `${views} views · ${components.components} components · variables for color (Light and Dark), spacing, radius and fonts.`,
    32,
    400,
  )
  line(
    `Generated ${new Date().toISOString().slice(0, 10)} by design/capture.ts from the running app (src/). ` +
      'Re-running the capture replaces this file: change the app, or copy what you design into a new file.',
    32,
    400,
  )
  // Wrapped lines need measured heights, or the next line overlaps them.
  await checkLayout(graph, frame.id, new Map(), { fallBack: false })
}

const graph = new SceneGraph()
const [firstPage] = graph.getPages()
if (!firstPage) throw new Error('a new document has no page')
const library = graph.addPage('Components')

const css = await readFile(join(import.meta.dir, '../src/styles.css'), 'utf8')
const tokenFiles: TokenFile[] = variableTokenFiles(parseTheme(css))
const skipped = importTokens(graph, library.id, tokenFiles)
if (skipped.length) console.warn('tokens skipped:', skipped)
const binder = new ThemeBinder(graph)

const browser = CDP_URL
  ? await chromium.connectOverCDP(CDP_URL)
  : await chromium.launch()
// The mobile capture is a touch phone, so `pointer: coarse` styles (44px targets) apply.
const pages = new Map<string, Page>()
for (const viewport of VIEWPORTS) {
  const touch = viewport.name === 'Mobile'
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    isMobile: touch,
    hasTouch: touch,
  })
  pages.set(viewport.name, await context.newPage())
}

const elements = new Map<string, SnapshotElement>()
const measured = new Map<string, Box>()
const artboards: { id: string; name: string }[] = []
const viewPages: string[] = []
let colorsBound = 0
let numbersBound = 0

for (const view of VIEWS) {
  if (ONLY && !ONLY.includes(view.name)) continue
  const viewPage = graph.addPage(view.name)
  let x = 0
  for (const viewport of VIEWPORTS) {
    let snapshot: SnapshotElement | null = null
    // A dev server can reload the page mid-capture (dependency re-optimization), so retry.
    for (let attempt = 1; ; attempt++) {
      try {
        snapshot = await snapshotView(
          pages.get(viewport.name) as Page,
          view,
          viewport,
        )
        break
      } catch (error) {
        if (attempt === 3) throw error
        console.warn(
          `retry ${view.name} (${viewport.name}): ${error instanceof Error ? error.message.split('\n')[0] : error}`,
        )
      }
    }
    if (!snapshot) {
      console.warn(`skip ${view.name}: no entry linked from ${view.path}`)
      break
    }
    const builder = new SceneBuilder(graph, loadImage)
    const name = `${view.name} — ${viewport.name}`
    const root = await builder.view(snapshot, viewPage.id, name)
    graph.updateNode(root.id, { x })
    // A page longer than the screen marks where the screen ends.
    if (snapshot.box.height > viewport.height)
      graph.updateNode(root.id, {
        guides: [
          { id: `${root.id}:fold`, axis: 'y', position: viewport.height },
        ],
      })
    x += snapshot.box.width + ARTBOARD_GAP
    await prepareGraphFonts(graph, [root.id])
    const report = await checkLayout(graph, root.id, builder.measured)
    for (const use of builder.colors)
      if (graph.getNode(use.nodeId) && binder.color(use)) colorsBound++
    for (const id of builder.measured.keys()) {
      const node = graph.getNode(id)
      if (node) numbersBound += binder.numbers(node)
    }
    for (const [id, element] of builder.elements) elements.set(id, element)
    for (const [id, box] of builder.measured) measured.set(id, box)
    artboards.push({ id: root.id, name })
    console.log(
      `${name}: ${report.layers} layers, ${report.autoLayout} auto layout, ${report.fallbacks.length} fixed`,
    )
  }
  if (x > 0) viewPages.push(viewPage.id)
  else graph.deleteNode(viewPage.id)
}
await browser.close()

// Text styles for the type the views use, then every matching layer takes its style.
const texts = [...graph.getAllNodes()].filter(
  (node): node is SceneNode => node.type === 'TEXT' && !node.internalOnly,
)
const typography = typographyTokenFile(texts)
importTokens(graph, library.id, [typography])
const styles = new StyleMatcher(graph)
let styled = 0
for (const node of graph.getAllNodes())
  if (!node.internalOnly && styles.apply(node)) styled++

const components = extractComponents(
  graph,
  viewPages,
  library.id,
  elements,
  measured,
)
// The cover leads; the library pages follow the views.
await cover(graph, firstPage.id, viewPages.length, components)
for (const name of ['Components', 'Primitives', 'Icons']) {
  const libraryPage = graph
    .getPages()
    .find((candidate) => candidate.name === name)
  if (libraryPage)
    graph.reorderChild(libraryPage.id, graph.rootId, graph.getPages().length)
}
// .fig keeps pages in order-key order; without keys it writes them in the order above.
for (const page of graph.getPages())
  page.source = { ...page.source, orderKey: null }

// Instances must still lay out as the page did.
let drift = 0
for (const artboard of artboards) {
  const report = await checkLayout(graph, artboard.id, measured, {
    fallBack: false,
  })
  drift += report.fallbacks.length
  if (report.fallbacks.length)
    console.warn(
      `${artboard.name}: ${report.fallbacks.length} frames off after componentizing`,
    )
}

if (process.env.DEBUG_TEXT)
  for (const node of graph.getAllNodes()) {
    const box = measured.get(node.id)
    if (node.type !== 'TEXT' || !box || Math.abs(box.height - node.height) < 3)
      continue
    let owner = graph.getNode(node.parentId ?? '')
    while (owner && owner.type !== 'INSTANCE')
      owner = graph.getNode(owner.parentId ?? '')
    const main = owner?.componentId ? graph.getNode(owner.componentId) : null
    console.log(
      'TEXT',
      JSON.stringify({
        text: node.text,
        box,
        w: node.width,
        h: node.height,
        ar: node.textAutoResize,
        lh: node.lineHeight,
        fs: node.fontSize,
        ff: node.fontFamily,
        fw: node.fontWeight,
        style: node.textStyleId,
        bv: node.boundVariables,
        self: node.layoutAlignSelf,
        grow: node.layoutGrow,
        owner: owner?.name,
        main: main?.name,
      }),
    )
  }
// The token files the document was built from, for code to read and other tools to import.
await rm(TOKENS_DIR, { recursive: true, force: true })
const merged: TokenFile[] = tokenFiles.map((file) =>
  file.path === typography.path
    ? {
        ...file,
        content: {
          ...(file.content as object),
          ...(typography.content as object),
        },
      }
    : file,
)
for (const file of merged) {
  const path = join(TOKENS_DIR, file.path)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(file.content, null, 2)}\n`)
}

await mkdir(dirname(OUTPUT), { recursive: true })
const { data } = await new IORegistry(BUILTIN_IO_FORMATS).writeDocument(
  'fig',
  graph,
)
await writeFile(OUTPUT, data as Uint8Array)
console.log(
  `wrote ${OUTPUT}: ${viewPages.length} views, ${graph.nodes.size} nodes, ${colorsBound} colors and ${numbersBound} sizes bound, ` +
    `${styled} styled layers, ${components.components} components (${components.sets} sets, ${components.instances} instances), ` +
    `${drift} frames off after componentizing`,
)

// The saved document must still look like the pages: reopen it, give its layers the
// boxes their originals were measured at, and lay every artboard out again.
const io = new IORegistry(BUILTIN_IO_FORMATS)
const { graph: saved } = await io.readDocument({
  name: OUTPUT,
  data: data as Uint8Array,
})
for (const savedPage of saved.getPages())
  await populateFigPage(saved, savedPage.id)
const savedMeasured = new Map<string, Box>()
const pair = (from: SceneNode, to: SceneNode) => {
  const box = measured.get(from.id)
  if (box) savedMeasured.set(to.id, box)
  const targets = saved.getChildren(to.id)
  graph.getChildren(from.id).forEach((child, i) => {
    const target = targets[i]
    if (target) pair(child, target)
  })
}
let reopened = 0
for (const artboard of artboards) {
  const original = graph.getNode(artboard.id)
  const copy = [...saved.getAllNodes()].find(
    (node) =>
      node.name === artboard.name &&
      node.parentId &&
      saved.getNode(node.parentId)?.type === 'CANVAS',
  )
  if (!original || !copy) continue
  pair(original, copy)
  const report = await checkLayout(saved, copy.id, savedMeasured, {
    fallBack: false,
  })
  reopened += report.fallbacks.length
  if (report.fallbacks.length)
    console.warn(
      `${artboard.name}: ${report.fallbacks.length} frames off after reopening`,
    )
}
console.log(`reopened ${OUTPUT}: ${reopened} frames off`)
