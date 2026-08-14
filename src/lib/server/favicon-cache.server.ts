import '@tanstack/react-start/server-only'
import {
  getFaviconStoragePath,
  getWebsiteOrigin,
  type WebsiteEntityType,
} from '@/lib/favicon'
import { getStorage, type StorageProvider } from '@/lib/storage'

const FAVICON_TIMEOUT_MS = 10_000
const MAX_FAVICON_BYTES = 512 * 1024

type FaviconEntity = {
  readonly entityType: WebsiteEntityType
  readonly entityId: number
  readonly website?: string | null
}

type FaviconCacheDependencies = {
  readonly fetch: typeof fetch
  readonly storage: StorageProvider
}

function faviconDiscoveryUrl(origin: string): URL {
  const url = new URL('https://www.google.com/s2/favicons')
  url.searchParams.set('domain_url', origin)
  url.searchParams.set('sz', '128')
  return url
}

async function deleteIfPresent(
  storage: StorageProvider,
  storagePath: string,
): Promise<void> {
  if (await storage.exists(storagePath)) await storage.delete(storagePath)
}

async function downloadFavicon(
  origin: string,
  fetchImplementation: typeof fetch,
): Promise<Blob> {
  const response = await fetchImplementation(faviconDiscoveryUrl(origin), {
    redirect: 'follow',
    signal: AbortSignal.timeout(FAVICON_TIMEOUT_MS),
    headers: { Accept: 'image/png' },
  })
  if (!response.ok) {
    throw new Error(`Favicon provider returned ${response.status}`)
  }

  const mimeType = response.headers.get('content-type')?.split(';', 1)[0]
  if (mimeType !== 'image/png') {
    throw new Error('Favicon provider returned an unsupported image type')
  }

  const declaredSize = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredSize) && declaredSize > MAX_FAVICON_BYTES) {
    throw new Error('Favicon response is too large')
  }

  const bytes = await response.arrayBuffer()
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_FAVICON_BYTES) {
    throw new Error('Favicon response has an invalid size')
  }

  return new Blob([bytes], { type: 'image/png' })
}

export async function refreshWebsiteFavicon(
  entity: FaviconEntity,
  dependencies: FaviconCacheDependencies = {
    fetch,
    storage: getStorage(),
  },
): Promise<void> {
  const storagePath = getFaviconStoragePath(entity.entityType, entity.entityId)
  const origin = getWebsiteOrigin(entity.website)

  if (!origin) {
    await deleteIfPresent(dependencies.storage, storagePath)
    return
  }

  // Only overwrite after a complete, valid response. A missing favicon or a
  // failed request therefore leaves the last successful logo untouched.
  const favicon = await downloadFavicon(origin, dependencies.fetch)
  await dependencies.storage.upload(favicon, storagePath)
}

export async function refreshWebsiteFaviconBestEffort(
  entity: FaviconEntity,
): Promise<void> {
  try {
    await refreshWebsiteFavicon(entity)
  } catch (error) {
    console.error(
      `Failed to refresh ${entity.entityType} favicon: ${entity.entityId}`,
      error,
    )
  }
}

export async function deleteWebsiteFaviconBestEffort(
  entityType: WebsiteEntityType,
  entityId: number,
): Promise<void> {
  try {
    await deleteIfPresent(
      getStorage(),
      getFaviconStoragePath(entityType, entityId),
    )
  } catch (error) {
    console.error(`Failed to delete ${entityType} favicon: ${entityId}`, error)
  }
}
