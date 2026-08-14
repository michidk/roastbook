import { describe, expect, test } from 'bun:test'
import { refreshWebsiteFavicon } from '@/lib/server/favicon-cache.server'
import type { StorageProvider } from '@/lib/storage'

class MemoryStorage implements StorageProvider {
  readonly files = new Map<string, Blob>()

  async upload(file: File | Blob, path: string) {
    this.files.set(path, file)
    return path
  }

  async download(path: string) {
    const file = this.files.get(path)
    if (!file) throw new Error('Not found')
    return file
  }

  async delete(path: string) {
    this.files.delete(path)
  }

  getUrl(path: string) {
    return `/media/${path}`
  }

  async exists(path: string) {
    return this.files.has(path)
  }

  async list(prefix = '') {
    return [...this.files.keys()].filter((path) => path.startsWith(prefix))
  }

  async listObjects(prefix = '') {
    return Promise.all(
      (await this.list(prefix)).map(async (path) => ({
        path,
        sizeBytes: (await this.download(path)).size,
      })),
    )
  }
}

function pngResponse(contents: string) {
  return new Response(contents, {
    headers: { 'Content-Type': 'image/png' },
  })
}

function fetchMock(response: () => Response): typeof fetch {
  return Object.assign(async () => response(), { preconnect: fetch.preconnect })
}

describe('favicon storage cache', () => {
  test('stores and overwrites a deterministic favicon on every refresh', async () => {
    const storage = new MemoryStorage()
    let requestCount = 0
    const request = fetchMock(() => {
      requestCount += 1
      return pngResponse(`favicon-${requestCount}`)
    })
    const entity = {
      entityType: 'roasters' as const,
      entityId: 12,
      website: 'https://coffee.example/about',
    }

    await refreshWebsiteFavicon(entity, { fetch: request, storage })
    await refreshWebsiteFavicon(entity, { fetch: request, storage })

    expect(requestCount).toBe(2)
    expect(
      await (await storage.download('favicons/roasters/12.png')).text(),
    ).toBe('favicon-2')
  })

  test('removes the cached favicon when the website is cleared', async () => {
    const storage = new MemoryStorage()
    await storage.upload(new Blob(['cached']), 'favicons/roasters/9.png')

    await refreshWebsiteFavicon(
      { entityType: 'roasters', entityId: 9, website: null },
      { fetch, storage },
    )

    expect(await storage.exists('favicons/roasters/9.png')).toBe(false)
  })

  test('keeps the previous favicon if the replacement cannot be fetched', async () => {
    const storage = new MemoryStorage()
    await storage.upload(new Blob(['old']), 'favicons/coffee-shops/3.png')
    const request = fetchMock(
      () => new Response('Unavailable', { status: 503 }),
    )

    await expect(
      refreshWebsiteFavicon(
        {
          entityType: 'coffee-shops',
          entityId: 3,
          website: 'https://new.example',
        },
        { fetch: request, storage },
      ),
    ).rejects.toThrow('Favicon provider returned 503')

    expect(
      await (await storage.download('favicons/coffee-shops/3.png')).text(),
    ).toBe('old')
  })

  test('keeps the previous favicon when the website has no favicon', async () => {
    const storage = new MemoryStorage()
    await storage.upload(new Blob(['old']), 'favicons/roasters/4.png')
    const request = fetchMock(() => new Response('Not found', { status: 404 }))

    await expect(
      refreshWebsiteFavicon(
        {
          entityType: 'roasters',
          entityId: 4,
          website: 'https://no-favicon.example',
        },
        { fetch: request, storage },
      ),
    ).rejects.toThrow('Favicon provider returned 404')

    expect(
      await (await storage.download('favicons/roasters/4.png')).text(),
    ).toBe('old')
  })
})
