function thumbnailPath(storagePath: string): string {
  const dot = storagePath.lastIndexOf(".")
  const base = dot === -1 ? storagePath : storagePath.slice(0, dot)
  return `${base}.thumb.webp`
}

export function thumbnailUrl(baseUrl: string, storagePath: string): string {
  return `${baseUrl}/${thumbnailPath(storagePath)}`
}
