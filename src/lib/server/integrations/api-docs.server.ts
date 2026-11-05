import '@tanstack/react-start/server-only'
import { scalarBundle } from '@/lib/server/integrations/api-reference-bundle.server'
import { PALETTE_RESTORE_SCRIPT, THEME_BOOTSTRAP_SCRIPT } from '@/lib/theme'

/**
 * The public API reference at `/api/v1/docs`: Scalar's browser build reading
 * the generated `/api/v1/openapi.json`, styled with the app's palette. It is a
 * standalone page under `/api/v1` so it needs no session and passes proxies
 * that let the API through (Hodor's BYPASS_PATHS), and always documents the
 * running version. Signed-in visitors send test requests through
 * `API_TRY_BASE_PATH` without a key.
 */
const API_DOCS_PATH = '/docs'

/**
 * The same API for the reference's "Test request" while signed in. It sits
 * behind the app's own sign-in (and Hodor, which does not bypass it) and runs
 * as the signed-in account, so the page needs no API key.
 */
export const API_TRY_BASE_PATH = '/api/try/v1'
/** Required on try requests: a custom header makes browsers preflight
 * cross-site requests, which this server never allows. */
export const API_TRY_HEADER = 'x-roastbook-api-reference'

export function isApiTryPath(path: string) {
  return path === API_TRY_BASE_PATH || path.startsWith(`${API_TRY_BASE_PATH}/`)
}
const SCRIPT_PREFIX = `${API_DOCS_PATH}/scalar/`

const PAGE_SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'none'",
    "script-src 'self' 'unsafe-inline' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data:",
    // "Test request" calls this server only, never a third-party proxy.
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; '),
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

/** Maps Scalar's variables onto the palette tokens in theme-tokens.css. */
const SCALAR_THEME = `
html { background: var(--background); color: var(--foreground); }
body { margin: 0; font-family: var(--font-body); }

:root, body, .scalar-app, .scalar-app .light-mode, .scalar-app .dark-mode {
  --scalar-font: var(--font-body);
  --scalar-font-code: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --scalar-radius: calc(var(--radius) - 4px);
  --scalar-radius-lg: var(--radius);
  --scalar-radius-xl: calc(var(--radius) + 4px);
  --scalar-heading-1: 1.875rem;
  --scalar-heading-2: 1.125rem;
  --scalar-heading-3: 1rem;
  --scalar-bold: 700;
  --scalar-semibold: 600;
  --scalar-border-width: 1px;
  --scalar-background-1: var(--background);
  --scalar-background-2: var(--card);
  --scalar-background-3: var(--muted);
  --scalar-background-accent: color-mix(in srgb, var(--primary) 14%, transparent);
  --scalar-color-1: var(--foreground);
  --scalar-color-2: var(--muted-foreground);
  --scalar-color-3: color-mix(in srgb, var(--muted-foreground) 78%, var(--background));
  --scalar-color-accent: var(--link);
  --scalar-color-green: var(--positive-text);
  --scalar-color-red: var(--destructive-text);
  --scalar-color-orange: var(--primary);
  --scalar-color-yellow: var(--warning-foreground);
  --scalar-color-blue: var(--link);
  --scalar-color-purple: var(--favorite);
  --scalar-border-color: var(--border);
  --scalar-button-1: var(--primary);
  --scalar-button-1-color: var(--primary-foreground);
  --scalar-button-1-hover: color-mix(in srgb, var(--primary) 88%, var(--foreground));
  --scalar-sidebar-background-1: var(--card);
  --scalar-sidebar-color-1: var(--foreground);
  --scalar-sidebar-color-2: var(--muted-foreground);
  --scalar-sidebar-color-active: var(--accent-foreground);
  --scalar-sidebar-item-hover-background: var(--accent);
  --scalar-sidebar-item-hover-color: var(--accent-foreground);
  --scalar-sidebar-item-active-background: var(--accent);
  --scalar-sidebar-border-color: var(--border);
  --scalar-sidebar-search-background: var(--card);
  --scalar-sidebar-search-border-color: var(--border);
  --scalar-sidebar-search-color: var(--muted-foreground);
}
:root { --scalar-custom-header-height: 3.5rem; }
.roastbook-bar {
  position: fixed; inset: 0 0 auto; z-index: 20;
  height: var(--scalar-custom-header-height);
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: 0 1rem; box-sizing: border-box;
  background: var(--card); color: var(--muted-foreground);
  border-bottom: 1px solid var(--border);
  font: 500 0.875rem/1.4 var(--font-body);
}
.roastbook-bar a { display: inline-flex; align-items: center; min-height: 44px; color: var(--link); text-underline-offset: 4px; }
.roastbook-bar a:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
.roastbook-bar .brand {
  flex-shrink: 0; color: var(--foreground); font-size: 1.25rem; font-weight: 800; text-decoration: none;
  font-family: var(--font-heading);
}
.roastbook-bar .status { text-align: right; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.scalar-app h1, .scalar-app h2, .scalar-app h3,
.scalar-app .section-header-label, .scalar-app .sidebar-heading {
  font-family: var(--font-heading);
  font-weight: 700;
  letter-spacing: -0.025em;
}
.scalar-app h1 { font-weight: 800; line-height: 1.1; }
.scalar-app .scalar-button {
  border-radius: 9999px;
  font-family: var(--font-heading);
  font-weight: 700;
}
@media (min-width: 640px) { .scalar-app { --scalar-heading-1: 3rem; } }
@media (pointer: coarse) { .scalar-app .scalar-button { min-height: 44px; } }
@media (max-width: 639px) {
  .roastbook-bar { gap: 0.75rem; }
  .roastbook-bar .status { font-size: 0.75rem; }
}
`

/** JSON for an inline <script>, safe against `</script>` in values. */
function inlineJson(value: unknown) {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

const REFERENCE_CONFIGURATION = {
  url: '/api/v1/openapi.json',
  theme: 'none',
  customCss: SCALAR_THEME,
  withDefaultFonts: false,
  telemetry: false,
  hideDarkModeToggle: true,
  showDeveloperTools: 'never',
  mcp: { disabled: true },
  agent: { disabled: true },
  persistAuth: false,
  hideClientButton: true,
  defaultHttpClient: { targetKey: 'shell', clientKey: 'curl' },
  favicon: '/favicon.ico',
  metaData: { title: 'Roastbook API reference' },
  authentication: { preferredSecurityScheme: 'bearer' },
}

/**
 * Runs in the page after `REFERENCE` ({ scriptUrl, configuration }) is set.
 * Signed in (or inside the Hodor gate), test requests without a key run as
 * the account through API_TRY_BASE_PATH; anyone else needs a key, as with curl.
 */
const CLIENT_SCRIPT = `
var API_BASE = '/api/v1'
var TRY_BASE = '${API_TRY_BASE_PATH}'
var sessionStatus = document.getElementById('roastbook-session')
var signedIn = fetch('/api/auth-probe', { cache: 'no-store', redirect: 'manual' })
  .then(function (response) { return response.status === 204 })
  .catch(function () { return false })
signedIn.then(function (yes) {
  sessionStatus.textContent = ''
  if (yes) {
    sessionStatus.textContent = 'Test requests use your account'
    return
  }
  var link = document.createElement('a')
  link.href = '/settings/api'
  link.textContent = 'Sign in to send test requests'
  sessionStatus.append(link)
})

function isApiOperation(url) {
  return url.origin === location.origin &&
    (url.pathname === API_BASE || url.pathname.indexOf(API_BASE + '/') === 0) &&
    url.pathname !== API_BASE + '/openapi.json' &&
    url.pathname.indexOf(API_BASE + '/docs') !== 0
}

function referenceFetch(input, init) {
  var request = new Request(input, init)
  var url = new URL(request.url)
  var authorization = request.headers.get('authorization')
  var hasKey = !!authorization && !/^Bearer\\s*$/i.test(authorization)
  if (hasKey || !isApiOperation(url)) return fetch(request)
  return signedIn.then(function (yes) {
    if (!yes) return fetch(request)
    url.pathname = TRY_BASE + url.pathname.slice(API_BASE.length)
    var headers = new Headers(request.headers)
    headers.delete('authorization')
    headers.set('${API_TRY_HEADER}', '1')
    var bodyless = request.method === 'GET' || request.method === 'HEAD'
    return (bodyless ? Promise.resolve(undefined) : request.arrayBuffer())
      .then(function (body) {
        return fetch(url, {
          method: request.method,
          headers: headers,
          body: body,
          redirect: 'manual',
          signal: request.signal,
        })
      })
  })
}

// Fetched rather than <script src> because Vite's dev server claims every
// script request; the response is cached immutably either way.
var configuration = REFERENCE.configuration
var dark = document.documentElement.classList.contains('dark')
configuration.forceDarkModeState = dark ? 'dark' : 'light'
configuration.customFetch = referenceFetch
fetch(REFERENCE.scriptUrl)
  .then(function (response) {
    if (!response.ok) throw new Error('Could not load the API reference')
    return response.blob()
  })
  .then(function (code) {
    var script = document.createElement('script')
    script.src = URL.createObjectURL(code)
    script.onload = function () {
      Scalar.createApiReference('#roastbook-api-reference', configuration)
    }
    document.body.append(script)
  })
  .catch(function (error) {
    document.getElementById('roastbook-api-reference').textContent =
      error.message + '. The OpenAPI description is at /api/v1/openapi.json.'
  })
`

const PAGE_HEAD = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Roastbook API reference</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
`

const PAGE_HEADER = `<header class="roastbook-bar">
<a class="brand" href="/">Roastbook</a>
<span class="status" id="roastbook-session" role="status">API reference</span>
</header>
<div id="roastbook-api-reference"></div>`

async function docsPage() {
  const [{ version }, { default: typography }, { default: tokens }] =
    await Promise.all([
      scalarBundle(),
      import('@/typography.css?raw'),
      import('@/theme-tokens.css?raw'),
    ])
  const reference = {
    scriptUrl: `/api/v1${SCRIPT_PREFIX}${version}`,
    configuration: REFERENCE_CONFIGURATION,
  }
  const html = `<!doctype html>
<html lang="en">
<head>
${PAGE_HEAD}
<style>${typography}
${tokens}
${SCALAR_THEME}</style>
<script>${PALETTE_RESTORE_SCRIPT};
${THEME_BOOTSTRAP_SCRIPT}</script>
</head>
<body>
${PAGE_HEADER}
<script>var REFERENCE = ${inlineJson(reference)}</script>
<script>${CLIENT_SCRIPT}</script>
</body>
</html>`
  return new Response(html, {
    headers: {
      ...PAGE_SECURITY_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}

async function docsScript(path: string) {
  const { script, version } = await scalarBundle()
  if (path !== `${SCRIPT_PREFIX}${version}`) return null
  return new Response(script, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

/** Whether `path` (below `/api/v1`) belongs to the public API reference. */
export function isApiDocsPath(path: string) {
  return path === API_DOCS_PATH || path.startsWith(SCRIPT_PREFIX)
}

/** Serves the reference page and its scripts; null for unknown files. */
export function handleApiDocsRequest(path: string) {
  return path === API_DOCS_PATH ? docsPage() : docsScript(path)
}
