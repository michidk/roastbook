const BUILD_ID = '__BUILD_ID__'
const PRECACHE_CACHE = `roastbook-precache-${BUILD_ID}`
const DOCUMENT_CACHE = `roastbook-documents-${BUILD_ID}`
const ASSET_CACHE = 'roastbook-assets-v2'
const LEGACY_ASSET_CACHES = ['roastbook-assets']
const OFFLINE_URL = '/offline.html'
const JOURNAL_SHELL_URL = '/offline-shell.html'
const MAX_ASSET_ENTRIES = 100
const MAX_DOCUMENT_ENTRIES = 20
const MAX_ASSET_BYTES = 2097152
// The journal database engine must be available offline; it is larger.
const MAX_ENGINE_BYTES = 16777216
const ENGINE_ASSET = /^\/assets\/(?:pglite|initdb)-[\w-]+\.(?:wasm|data)$/
const EXCLUDED_PATHS = new Set(['/sw.js'])
const EXCLUDED_PREFIXES = ['/api/', '/_serverFn/', '/_gate/', '/media/']
const PRECACHE_ASSETS = __PRECACHE_ASSETS__
const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/logo-maskable-192.png',
  '/logo-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/navbar-logo.png',
  '/paper-grain-light.svg',
  '/paper-grain-dark.svg',
  '/coffee-stains-light.svg',
  '/coffee-stains-dark.svg',
]
const PRECACHE_PATHS = new Set([...PRECACHE_URLS, ...PRECACHE_ASSETS])
const DOCUMENT_PRECACHE_URLS = ['/overview', '/brews/new', '/brews/pending']

self.addEventListener('install', (event) => {
  event.waitUntil(precache())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(activate())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname === '/_gate/logout' || url.pathname === '/login') {
    event.respondWith(fetch(request).finally(clearDocumentCaches))
    return
  }

  if (isExcludedPath(url.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (PRECACHE_PATHS.has(url.pathname)) {
    event.respondWith(cacheFirstPrecache(request))
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirstAsset(request))
  }
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }
  if (event.data?.type === 'RESET_SHELL') {
    event.waitUntil(
      resetShell()
        .then(() => {
          event.source?.postMessage({ type: 'SHELL_RESET_COMPLETE' })
        })
        .catch(() => {
          event.source?.postMessage({ type: 'SHELL_RESET_FAILED' })
        }),
    )
  }
})

async function precache() {
  const cache = await caches.open(PRECACHE_CACHE)
  await Promise.all(PRECACHE_URLS.map((url) => precacheStatic(cache, url)))
  // Client chunks are large and can change independently; a failed chunk
  // must not prevent the worker (and its offline page) from installing.
  const assetResults = await Promise.allSettled(
    PRECACHE_ASSETS.map((url) => precacheStatic(cache, url)),
  )
  for (const [index, result] of assetResults.entries()) {
    if (result.status === 'rejected') {
      console.warn(
        'Failed to precache client asset',
        PRECACHE_ASSETS[index],
        result.reason,
      )
    }
  }
  await Promise.allSettled(DOCUMENT_PRECACHE_URLS.map(cacheDocument))
  // The dedicated public shell has no account data. Private documents stay uncached.
  await cacheDocument(JOURNAL_SHELL_URL)
}

async function precacheStatic(cache, url) {
  const request = new Request(url, { cache: 'reload' })
  const response = await fetch(request)
  const pathname = new URL(url, self.location.origin).pathname
  if (!(await isCacheableStaticResponse(response, pathname))) {
    throw new Error(`Refusing to precache an invalid response for ${url}`)
  }
  await cache.put(url, response)
}

async function cacheDocument(url) {
  try {
    const response = await fetch(
      new Request(url, {
        cache: 'reload',
        headers: { Accept: 'text/html' },
      }),
    )
    if (!isCacheableDocument(response)) return

    const cache = await caches.open(DOCUMENT_CACHE)
    await cache.put(url, response)
  } catch {
    // Offline readiness is best-effort; the app still works online.
  }
}

async function activate() {
  const keys = await caches.keys()
  await Promise.all(
    keys
      .filter(
        (key) =>
          (key.startsWith('roastbook-precache-') && key !== PRECACHE_CACHE) ||
          (key.startsWith('roastbook-documents-') && key !== DOCUMENT_CACHE) ||
          LEGACY_ASSET_CACHES.includes(key),
      )
      .map((key) => caches.delete(key)),
  )
  await self.clients.claim()
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request)
    if (isCacheableDocument(response)) {
      try {
        const cache = await caches.open(DOCUMENT_CACHE)
        await cache.put(request, response.clone())
        await trimCache(cache, MAX_DOCUMENT_ENTRIES)
      } catch {
        // A cache write failure must not block the navigation.
      }
    }
    return response
  } catch {
    const documentCache = await caches.open(DOCUMENT_CACHE)
    const cachedDocument = await documentCache.match(request, {
      ignoreSearch: true,
    })
    if (cachedDocument) return cachedDocument

    const shell = await documentCache.match(JOURNAL_SHELL_URL)
    if (shell) return shell

    const cache = await caches.open(PRECACHE_CACHE)
    const offlinePage = await cache.match(OFFLINE_URL)
    if (offlinePage) return offlinePage

    return new Response(
      '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline</title><body style="font-family:system-ui,sans-serif;padding:2rem"><h1>You are offline</h1><p>Reconnect and try again.</p></body></html>',
      {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    )
  }
}

function isCacheableDocument(response) {
  if (
    response.headers.get('X-Roastbook-Owner') &&
    response.headers.get('X-Roastbook-Owner') !== 'local'
  )
    return false
  if (!response.ok || response.redirected) return false
  if (response.headers.get('content-type')?.includes('text/html') !== true) {
    return false
  }

  const url = new URL(response.url)
  if (url.pathname.startsWith('/_gate/')) return false
  return true
}

async function clearDocumentCaches() {
  const keys = await caches.keys()
  await Promise.all(
    keys
      .filter((key) => key.startsWith('roastbook-documents-'))
      .map((key) => caches.delete(key)),
  )
}

async function cacheFirstPrecache(request) {
  const cache = await caches.open(PRECACHE_CACHE)
  const pathname = new URL(request.url).pathname
  const cached = await cache.match(request, { ignoreSearch: true })
  if (cached) {
    if (
      await isCacheableStaticResponse(cached, pathname, { checkSize: false })
    ) {
      return cached
    }
    const keys = await cache.keys()
    await Promise.all(
      keys
        .filter((key) => new URL(key.url).pathname === pathname)
        .map((key) => cache.delete(key)),
    )
  }

  if (pathname.startsWith('/assets/')) {
    return cacheFirstAsset(request)
  }
  return fetch(request)
}

async function cacheFirstAsset(request) {
  const pathname = new URL(request.url).pathname
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request)
  if (cached) {
    if (
      await isCacheableStaticResponse(cached, pathname, { checkSize: false })
    ) {
      return cached
    }
    await cache.delete(request)
  }

  const response = await fetch(request)
  if (await isCacheableStaticResponse(response, pathname)) {
    try {
      await cache.put(request, response.clone())
      await trimCache(cache, MAX_ASSET_ENTRIES)
    } catch {
      // A cache write failure must not block the asset response.
    }
  }
  return response
}

const STATIC_CONTENT_TYPES = {
  '.css': ['text/css'],
  '.html': ['text/html'],
  '.ico': ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png'],
  '.js': ['text/javascript', 'application/javascript'],
  '.json': ['application/json'],
  '.mjs': ['text/javascript', 'application/javascript'],
  '.otf': ['font/otf', 'application/font-sfnt'],
  '.png': ['image/png'],
  '.svg': ['image/svg+xml'],
  '.ttf': ['font/ttf', 'application/font-sfnt'],
  '.webp': ['image/webp'],
  '.woff': ['font/woff', 'application/font-woff'],
  '.woff2': ['font/woff2', 'application/font-woff2'],
}

function expectedContentTypes(pathname) {
  const extension = pathname.slice(pathname.lastIndexOf('.')).toLowerCase()
  return STATIC_CONTENT_TYPES[extension] ?? null
}

function declaredContentLength(response) {
  const value = response.headers.get('content-length')
  if (!value) return null
  const length = Number(value)
  return Number.isFinite(length) && length >= 0 ? length : null
}

async function isCacheableStaticResponse(
  response,
  pathname,
  options = { checkSize: true },
) {
  if (
    response.headers.get('X-Roastbook-Owner') &&
    response.headers.get('X-Roastbook-Owner') !== 'local'
  )
    return false
  if (!response.ok || response.redirected) return false

  const contentType = response.headers.get('content-type')?.toLowerCase()
  if (!contentType) return false
  if (contentType.includes('text/html')) return pathname.endsWith('.html')

  if (options.checkSize) {
    const limit = ENGINE_ASSET.test(pathname)
      ? MAX_ENGINE_BYTES
      : MAX_ASSET_BYTES
    const declaredLength = declaredContentLength(response)
    if (declaredLength !== null) {
      if (declaredLength > limit) return false
    } else {
      try {
        const body = await response.clone().blob()
        if (body.size > limit) return false
      } catch {
        return false
      }
    }
  }

  const expected = expectedContentTypes(pathname)
  if (!expected) return true
  return expected.some((type) => contentType.includes(type))
}

async function resetShell() {
  const keys = await caches.keys()
  await Promise.all(
    keys
      .filter(
        (key) =>
          key === ASSET_CACHE ||
          key.startsWith('roastbook-precache-') ||
          key.startsWith('roastbook-documents-'),
      )
      .map((key) => caches.delete(key)),
  )
  await self.registration.unregister()
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys()
  const excess = keys.length - maxEntries
  if (excess <= 0) return

  await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)))
}

function isExcludedPath(pathname) {
  return (
    EXCLUDED_PATHS.has(pathname) ||
    EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  )
}
