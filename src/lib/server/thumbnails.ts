import sharp from "sharp"
import { getStorage } from "@/lib/storage"

const THUMB_WIDTH = 640
const THUMB_QUALITY = 78

export function getThumbnailPath(storagePath: string): string {
  const dot = storagePath.lastIndexOf(".")
  const base = dot === -1 ? storagePath : storagePath.slice(0, dot)
  return `${base}.thumb.webp`
}

export async function generateAndUploadThumbnail(
  buffer: Buffer,
  storagePath: string,
): Promise<string | null> {
  try {
    const thumbBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer()

    const thumbPath = getThumbnailPath(storagePath)
    const storage = getStorage()
    await storage.upload(new Blob([new Uint8Array(thumbBuffer)], { type: "image/webp" }), thumbPath)
    return thumbPath
  } catch (error) {
    console.warn(`Thumbnail generation failed for ${storagePath}:`, error)
    return null
  }
}
