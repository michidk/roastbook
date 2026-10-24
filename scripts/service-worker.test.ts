import { describe, expect, test } from 'bun:test'
import vm from 'node:vm'
import {
  ASSET_LIST_PLACEHOLDER,
  BUILD_ID_PLACEHOLDER,
  MAX_PRECACHE_ASSET_BYTES,
  PRECACHED_FILES,
  readServiceWorkerTemplate,
} from './service-worker-build'

const ORIGIN = 'https://roastbook.test'

interface RequestLike {
  method: string
  url: string
  mode: string
}

interface HarnessOptions {
  failPrecacheUrl?: string
}

class MockRequest extends Request {
  constructor(input: string | URL | Request, init?: RequestInit) {
    super(typeof input === 'string' ? absoluteUrl(input) : input, init)
  }
}

class MockCache {
  readonly entries = new Map<string, Response>()

  constructor(
    private readonly fetchImplementation: (url: string) => Promise<Response>,
  ) {}

  async add(request: RequestLike | Request): Promise<void> {
    const response = await this.fetchImplementation(request.url)
    if (!response.ok) throw new Error(`Failed to add ${request.url}`)
    this.entries.set(absoluteUrl(request.url), response)
  }

  async match(
    value: RequestLike | Request | string,
    options?: { ignoreSearch?: boolean },
  ): Promise<Response | undefined> {
    const url = absoluteUrl(typeof value === 'string' ? value : value.url)
    if (options?.ignoreSearch) {
      const parsed = new URL(url)
      for (const [key, response] of this.entries) {
        const candidate = new URL(key)
        if (
          candidate.origin === parsed.origin &&
          candidate.pathname === parsed.pathname
        ) {
          return response
        }
      }
    }
    return this.entries.get(url)
  }

  async put(
    request: RequestLike | Request | string,
    response: Response,
  ): Promise<void> {
    const url = typeof request === 'string' ? request : request.url
    this.entries.set(absoluteUrl(url), response)
  }

  async keys(): Promise<string[]> {
    return [...this.entries.keys()]
  }

  async delete(key: string | RequestLike | Request): Promise<boolean> {
    return this.entries.delete(
      absoluteUrl(typeof key === 'string' ? key : key.url),
    )
  }
}

function absoluteUrl(value: string): string {
  return new URL(value, ORIGIN).href
}

function htmlResponse(body: string, url: string): Response {
  const response = new Response(body, {
    headers: { 'content-type': 'text/html' },
  })
  Object.defineProperty(response, 'url', { value: url })
  return response
}

async function createHarness(options: HarnessOptions = {}) {
  const template = await readServiceWorkerTemplate()
  const source = template
    .replaceAll(BUILD_ID_PLACEHOLDER, 'testbuild1234')
    .replaceAll(
      ASSET_LIST_PLACEHOLDER,
      JSON.stringify(['/assets/test-bundle.js']),
    )
  const listeners = new Map<string, (event: unknown) => void>()
  const stores = new Map<string, MockCache>()
  const assetResponses = new Map<string, Response>()
  let offline = false
  let failPrecache = options.failPrecacheUrl !== undefined
  let skipWaitingCalls = 0
  let claimCalls = 0
  let unregisterCalls = 0

  const fetchImplementation = async (
    input: string | { url: string },
  ): Promise<Response> => {
    const url = absoluteUrl(typeof input === 'string' ? input : input.url)
    if (offline) throw new TypeError('Failed to fetch')
    if (
      failPrecache &&
      options.failPrecacheUrl &&
      url === absoluteUrl(options.failPrecacheUrl)
    ) {
      throw new TypeError('Failed to fetch')
    }
    const overridden =
      assetResponses.get(url) ?? assetResponses.get(new URL(url).pathname)
    if (overridden) return overridden.clone()
    if (url.endsWith('/offline.html')) {
      return new Response('<title>Offline | Roastbook</title>', {
        headers: { 'content-type': 'text/html' },
      })
    }
    if (url.endsWith('/manifest.json')) {
      return new Response('{}', {
        headers: { 'content-type': 'application/json' },
      })
    }
    if (url.endsWith('.svg')) {
      return new Response('icon', {
        headers: { 'content-type': 'image/svg+xml' },
      })
    }
    if (url.endsWith('.png') || url.endsWith('.ico')) {
      return new Response('icon', { headers: { 'content-type': 'image/png' } })
    }
    if (
      url.endsWith('/overview') ||
      url.endsWith('/brews/new') ||
      url.endsWith('/brews/pending')
    ) {
      return htmlResponse('app-document', url)
    }
    if (new URL(url).pathname.startsWith('/assets/')) {
      const contentType = new URL(url).pathname.endsWith('.css')
        ? 'text/css'
        : 'text/javascript'
      return new Response(`network:${url}`, {
        status: 200,
        headers: { 'content-type': contentType },
      })
    }
    return new Response(`network:${url}`, { status: 200 })
  }

  const caches = {
    async open(name: string): Promise<MockCache> {
      let cache = stores.get(name)
      if (!cache) {
        cache = new MockCache(fetchImplementation)
        stores.set(name, cache)
      }
      return cache
    },
    async keys(): Promise<string[]> {
      return [...stores.keys()]
    },
    async delete(name: string): Promise<boolean> {
      return stores.delete(name)
    },
  }

  const self = {
    location: { origin: ORIGIN },
    registration: {
      unregister() {
        unregisterCalls += 1
        return Promise.resolve(true)
      },
    },
    addEventListener(type: string, handler: (event: unknown) => void) {
      listeners.set(type, handler)
    },
    skipWaiting() {
      skipWaitingCalls += 1
      return Promise.resolve()
    },
    clients: {
      claim() {
        claimCalls += 1
        return Promise.resolve()
      },
    },
  }

  const sandbox = {
    console,
    caches,
    fetch: fetchImplementation,
    Request: MockRequest,
    Response,
    URL,
    Promise,
    setTimeout,
    clearTimeout,
    self,
  }

  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'sw.js' })

  async function dispatch(
    type: string,
    event: Record<string, unknown> = {},
  ): Promise<unknown> {
    let promise: Promise<unknown> | undefined
    const handler = listeners.get(type)
    if (!handler) throw new Error(`No ${type} listener`)

    handler({
      ...event,
      waitUntil(value: Promise<unknown>) {
        promise = value
      },
      respondWith(value: Promise<unknown>) {
        promise = value
      },
    })

    return promise ? await promise : undefined
  }

  function setOffline(value: boolean) {
    offline = value
  }

  function getPrecacheCache(): MockCache | undefined {
    const name = [...stores.keys()].find((key) =>
      key.startsWith('roastbook-precache-'),
    )
    return name ? stores.get(name) : undefined
  }

  function getDocumentCache(): MockCache | undefined {
    const name = [...stores.keys()].find((key) =>
      key.startsWith('roastbook-documents-'),
    )
    return name ? stores.get(name) : undefined
  }

  function getAssetCache(): MockCache | undefined {
    return stores.get('roastbook-assets')
  }

  function setAssetResponse(path: string, response: Response) {
    assetResponses.set(path, response)
  }

  function seedCache(name: string) {
    stores.set(name, new MockCache(fetchImplementation))
  }

  function hasCache(name: string): boolean {
    return stores.has(name)
  }

  return {
    dispatch,
    setOffline,
    setPrecacheFailure: (value: boolean) => {
      failPrecache = value
    },
    setAssetResponse,
    getPrecacheCache,
    getDocumentCache,
    getAssetCache,
    seedCache,
    hasCache,
    getSkipWaitingCalls: () => skipWaitingCalls,
    getClaimCalls: () => claimCalls,
    getUnregisterCalls: () => unregisterCalls,
  }
}

function request(path: string, mode = 'no-cors'): RequestLike {
  return { method: 'GET', url: absoluteUrl(path), mode }
}

describe('service worker', () => {
  test('precaches exactly the shared stable assets', async () => {
    const harness = await createHarness()
    await harness.dispatch('install')

    const precache = harness.getPrecacheCache()
    expect(precache).toBeDefined()
    expect((await precache?.keys())?.sort()).toEqual(
      [
        ...PRECACHED_FILES.map((file) => absoluteUrl(`/${file}`)),
        absoluteUrl('/assets/test-bundle.js'),
      ].sort(),
    )
  })

  test('precaches the offline app documents', async () => {
    const harness = await createHarness()
    await harness.dispatch('install')

    const keys = (await harness.getDocumentCache()?.keys()) ?? []
    expect(keys).toEqual(
      expect.arrayContaining([
        absoluteUrl('/overview'),
        absoluteUrl('/brews/new'),
        absoluteUrl('/brews/pending'),
      ]),
    )
  })

  test('caches app documents and serves them offline', async () => {
    const harness = await createHarness()
    await harness.dispatch('install')

    const online = await harness.dispatch('fetch', {
      request: request('/overview', 'navigate'),
    })
    expect(await (online as Response).text()).toBe('app-document')
    expect((await harness.getDocumentCache()?.keys()) ?? []).toContain(
      absoluteUrl('/overview'),
    )

    harness.setOffline(true)
    const cached = await harness.dispatch('fetch', {
      request: request('/overview', 'navigate'),
    })
    expect(await (cached as Response).text()).toBe('app-document')

    const uncached = await harness.dispatch('fetch', {
      request: request('/brews/uncached', 'navigate'),
    })
    expect(await (uncached as Response).text()).toContain('Offline | Roastbook')
  })

  test('clears cached documents on logout', async () => {
    const harness = await createHarness()
    await harness.dispatch('install')
    await harness.dispatch('fetch', {
      request: request('/overview', 'navigate'),
    })
    expect(harness.getDocumentCache()).toBeDefined()

    await harness.dispatch('fetch', {
      request: request('/_gate/logout', 'navigate'),
    })
    expect(harness.getDocumentCache()).toBeUndefined()
  })

  test('serves a precached icon while offline', async () => {
    const harness = await createHarness()
    await harness.dispatch('install')
    harness.setOffline(true)

    const response = await harness.dispatch('fetch', {
      request: request('/logo192.png'),
    })
    expect(await (response as Response).text()).toBe('icon')
  })

  test('caches hashed assets after the first request', async () => {
    const harness = await createHarness()

    const first = await harness.dispatch('fetch', {
      request: request('/assets/app-123.js'),
    })
    expect(await (first as Response).text()).toBe(
      `network:${absoluteUrl('/assets/app-123.js')}`,
    )

    harness.setOffline(true)
    const second = await harness.dispatch('fetch', {
      request: request('/assets/app-123.js'),
    })
    expect(await (second as Response).text()).toBe(
      `network:${absoluteUrl('/assets/app-123.js')}`,
    )
  })

  test('uses the shared asset size limit', async () => {
    const template = await readServiceWorkerTemplate()
    expect(template).toContain(
      `const MAX_ASSET_BYTES = ${MAX_PRECACHE_ASSET_BYTES}`,
    )
  })

  test('does not cache an HTML login response under an asset URL', async () => {
    const harness = await createHarness()
    harness.setAssetResponse(
      '/assets/login.js',
      htmlResponse('login', absoluteUrl('/assets/login.js')),
    )

    const response = await harness.dispatch('fetch', {
      request: request('/assets/login.js'),
    })

    expect(await (response as Response).text()).toBe('login')
    expect((await harness.getAssetCache()?.keys()) ?? []).not.toContain(
      absoluteUrl('/assets/login.js'),
    )
  })

  test('does not cache an asset above the size limit', async () => {
    const harness = await createHarness()
    harness.setAssetResponse(
      '/assets/large.js',
      new Response('large', {
        headers: {
          'content-type': 'text/javascript',
          'content-length': String(MAX_PRECACHE_ASSET_BYTES + 1),
        },
      }),
    )

    const response = await harness.dispatch('fetch', {
      request: request('/assets/large.js'),
    })

    expect(await (response as Response).text()).toBe('large')
    expect((await harness.getAssetCache()?.keys()) ?? []).not.toContain(
      absoluteUrl('/assets/large.js'),
    )
  })

  test('repairs a corrupt cached asset', async () => {
    const harness = await createHarness()
    harness.seedCache('roastbook-assets')
    const cache = harness.getAssetCache()
    if (!cache) throw new Error('Asset cache missing')
    await cache.put(
      new MockRequest('/assets/app-123.js'),
      htmlResponse('login', absoluteUrl('/assets/app-123.js')),
    )

    const response = await harness.dispatch('fetch', {
      request: request('/assets/app-123.js'),
    })

    expect(await (response as Response).text()).toBe(
      `network:${absoluteUrl('/assets/app-123.js')}`,
    )
    const repaired = await cache.match(new MockRequest('/assets/app-123.js'))
    expect(repaired?.headers.get('content-type')).toBe('text/javascript')
  })

  test('resets the shell caches without touching application data', async () => {
    const harness = await createHarness()
    harness.seedCache('roastbook-precache-test')
    harness.seedCache('roastbook-documents-test')
    harness.seedCache('roastbook-assets')
    const messages: unknown[] = []

    await harness.dispatch('message', {
      data: { type: 'RESET_SHELL' },
      source: {
        postMessage(message: unknown) {
          messages.push(message)
        },
      },
    })

    expect(harness.hasCache('roastbook-precache-test')).toBe(false)
    expect(harness.hasCache('roastbook-documents-test')).toBe(false)
    expect(harness.hasCache('roastbook-assets')).toBe(false)
    expect(harness.getUnregisterCalls()).toBe(1)
    expect(messages).toEqual([{ type: 'SHELL_RESET_COMPLETE' }])
  })

  test('leaves writes and protected requests alone', async () => {
    const harness = await createHarness()

    const requests = [
      { method: 'POST', url: absoluteUrl('/overview'), mode: 'navigate' },
      { method: 'GET', url: absoluteUrl('/api/health'), mode: 'cors' },
      { method: 'GET', url: absoluteUrl('/_serverFn/abc'), mode: 'cors' },
      { method: 'GET', url: absoluteUrl('/_gate/login'), mode: 'navigate' },
      {
        method: 'GET',
        url: absoluteUrl('/media/photo.webp'),
        mode: 'no-cors',
      },
      { method: 'GET', url: absoluteUrl('/sw.js'), mode: 'cors' },
    ]

    for (const entry of requests) {
      expect(
        await harness.dispatch('fetch', { request: entry }),
      ).toBeUndefined()
    }
  })

  test('fails installation when a required precache request fails', async () => {
    const harness = await createHarness({ failPrecacheUrl: '/logo192.png' })
    await expect(harness.dispatch('install')).rejects.toThrow()
  })

  test('keeps installing when a client asset cannot be precached', async () => {
    const harness = await createHarness({
      failPrecacheUrl: '/assets/test-bundle.js',
    })
    await expect(harness.dispatch('install')).resolves.toBeUndefined()

    const keys = (await harness.getPrecacheCache()?.keys()) ?? []
    expect(keys).not.toContain(absoluteUrl('/assets/test-bundle.js'))

    // A later online request should fall through to the runtime asset cache.
    harness.setPrecacheFailure(false)
    const online = await harness.dispatch('fetch', {
      request: request('/assets/test-bundle.js'),
    })
    expect(await (online as Response).text()).toBe(
      `network:${absoluteUrl('/assets/test-bundle.js')}`,
    )

    harness.setOffline(true)
    const offline = await harness.dispatch('fetch', {
      request: request('/assets/test-bundle.js'),
    })
    expect(await (offline as Response).text()).toBe(
      `network:${absoluteUrl('/assets/test-bundle.js')}`,
    )
  })

  test('cleans stale precache and document caches and claims clients', async () => {
    const harness = await createHarness()
    harness.seedCache('roastbook-precache-stale')
    harness.seedCache('roastbook-documents-stale')

    await harness.dispatch('activate')

    expect(harness.hasCache('roastbook-precache-stale')).toBe(false)
    expect(harness.hasCache('roastbook-documents-stale')).toBe(false)
    expect(harness.getClaimCalls()).toBe(1)
  })

  test('skips waiting when the update prompt asks it to', async () => {
    const harness = await createHarness()
    await harness.dispatch('message', { data: { type: 'SKIP_WAITING' } })
    expect(harness.getSkipWaitingCalls()).toBe(1)
  })
})
