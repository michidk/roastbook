export const STORAGE_BASE_URL =
  import.meta.env.VITE_STORAGE_URL || "/api/uploads"

function thumbnailPath(storagePath: string): string {
  const dot = storagePath.lastIndexOf(".")
  const base = dot === -1 ? storagePath : storagePath.slice(0, dot)
  return `${base}.thumb.webp`
}

export function imageUrl(storagePath: string): string {
  return `${STORAGE_BASE_URL}/${storagePath}`
}

export function thumbnailUrl(storagePath: string): string {
  return `${STORAGE_BASE_URL}/${thumbnailPath(storagePath)}`
}
