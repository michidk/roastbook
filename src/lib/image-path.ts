export function getThumbnailPath(storagePath: string): string {
  const dot = storagePath.lastIndexOf(".")
  const base = dot === -1 ? storagePath : storagePath.slice(0, dot)
  return `${base}.thumb.webp`
}
