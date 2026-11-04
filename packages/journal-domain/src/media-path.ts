export function getThumbnailPath(storagePath: string): string {
  const dot = storagePath.lastIndexOf('.')
  const base = dot === -1 ? storagePath : storagePath.slice(0, dot)
  return `${base}.thumb.webp`
}

export function getSmallThumbnailPath(storagePath: string): string {
  const dot = storagePath.lastIndexOf('.')
  const base = dot === -1 ? storagePath : storagePath.slice(0, dot)
  return `${base}.small.webp`
}

export function getStoredImagePaths(
  originalPaths: readonly string[],
): string[] {
  return originalPaths.flatMap((path) => [
    path,
    getThumbnailPath(path),
    getSmallThumbnailPath(path),
  ])
}
