const STORAGE_BASE_URL =
  import.meta.env.VITE_STORAGE_URL || "/media"

function storageUrl(storagePath: string, fallbackPath?: string): string {
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/")
  const url = `${STORAGE_BASE_URL.replace(/\/$/, "")}/${encodedPath}`

  if (!fallbackPath || STORAGE_BASE_URL !== "/media") return url

  const search = new URLSearchParams({ fallback: fallbackPath })
  return `${url}?${search}`
}

function thumbnailPath(storagePath: string): string {
  const dot = storagePath.lastIndexOf(".")
  const base = dot === -1 ? storagePath : storagePath.slice(0, dot)
  return `${base}.thumb.webp`
}

export function imageUrl(storagePath: string): string {
  return storageUrl(storagePath)
}

export function thumbnailUrl(storagePath: string): string {
  return storageUrl(thumbnailPath(storagePath), storagePath)
}
