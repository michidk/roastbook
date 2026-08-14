import { imageUrl } from '@/lib/image-url'

export type WebsiteEntityType = 'coffee-shops' | 'roasters'

export function getWebsiteOrigin(website?: string | null): string | undefined {
  if (!website) return undefined

  try {
    const url = new URL(website)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return url.origin
  } catch {
    return undefined
  }
}

export function getFaviconStoragePath(
  entityType: WebsiteEntityType,
  entityId: number,
): string {
  return `favicons/${entityType}/${entityId}.png`
}

export function getStoredFaviconUrl({
  entityType,
  entityId,
  updatedAt,
  website,
}: {
  readonly entityType: WebsiteEntityType
  readonly entityId: number
  readonly updatedAt: Date | string
  readonly website?: string | null
}): string | undefined {
  if (!getWebsiteOrigin(website)) return undefined

  const url = imageUrl(getFaviconStoragePath(entityType, entityId))
  const version = new Date(updatedAt).getTime()
  if (!Number.isFinite(version)) return url

  return `${url}${url.includes('?') ? '&' : '?'}v=${version}`
}
