const STORAGE_BASE_URL =
  import.meta.env.VITE_STORAGE_URL || "/api/uploads"

function storageUrl(storagePath: string, fallbackPath?: string): string {
  if (STORAGE_BASE_URL !== "/api/uploads") {
    const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/")
    return `${STORAGE_BASE_URL.replace(/\/$/, "")}/${encodedPath}`
  }

  const search = new URLSearchParams({ path: storagePath })
  if (fallbackPath) {
    search.set("fallback", fallbackPath)
  }
  return `${STORAGE_BASE_URL}?${search}`
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
