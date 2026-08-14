import { publicEnv } from '@/lib/env'
import { getThumbnailPath } from '@/lib/image-path'

const STORAGE_BASE_URL = publicEnv.VITE_STORAGE_URL

function storageUrl(storagePath: string, fallbackPath?: string): string {
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/')
  const url = `${STORAGE_BASE_URL.replace(/\/$/, '')}/${encodedPath}`

  if (!fallbackPath || STORAGE_BASE_URL !== '/media') return url

  const search = new URLSearchParams({ fallback: fallbackPath })
  return `${url}?${search}`
}

export function imageUrl(storagePath: string): string {
  return storageUrl(storagePath)
}

export function thumbnailUrl(storagePath: string): string {
  return storageUrl(getThumbnailPath(storagePath), storagePath)
}
