import { DEMO_MODE } from '@/lib/build-mode'
import { publicEnv } from '@/lib/env'
import { getSmallThumbnailPath, getThumbnailPath } from '@/lib/image-path'

const STORAGE_BASE_URL = publicEnv.VITE_STORAGE_URL

function storageUrl(storagePath: string, fallbackPath?: string): string {
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/')
  const url = `${STORAGE_BASE_URL.replace(/\/$/, '')}/${encodedPath}`

  if (
    !fallbackPath ||
    STORAGE_BASE_URL !== '/media' ||
    (DEMO_MODE && storagePath.startsWith('demo/'))
  )
    return url

  const search = new URLSearchParams({ fallback: fallbackPath })
  return `${url}?${search}`
}

export function imageUrl(storagePath: string): string {
  return storageUrl(storagePath)
}

export function thumbnailUrl(storagePath: string): string {
  return storageUrl(getThumbnailPath(storagePath), storagePath)
}

export function smallThumbnailUrl(storagePath: string): string {
  if (DEMO_MODE && storagePath.startsWith('demo/')) {
    return storageUrl(getSmallThumbnailPath(storagePath))
  }
  return storageUrl(
    getSmallThumbnailPath(storagePath),
    getThumbnailPath(storagePath),
  )
}
