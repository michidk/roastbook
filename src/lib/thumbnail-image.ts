import sharp from "sharp"

const THUMB_WIDTH = 640
const THUMB_QUALITY = 78

export function getThumbnailPath(storagePath: string): string {
  const dot = storagePath.lastIndexOf(".")
  const base = dot === -1 ? storagePath : storagePath.slice(0, dot)
  return `${base}.thumb.webp`
}

export function createThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer()
}
