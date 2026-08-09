import { getStorage } from "@/lib/storage"
import { createThumbnail, getThumbnailPath } from "@/lib/thumbnail-image"

export { getThumbnailPath } from "@/lib/thumbnail-image"

export async function generateAndUploadThumbnail(
  buffer: Buffer,
  storagePath: string,
): Promise<string | null> {
  try {
    const thumbBuffer = await createThumbnail(buffer)

    const thumbPath = getThumbnailPath(storagePath)
    const storage = getStorage()
    await storage.upload(new Blob([new Uint8Array(thumbBuffer)], { type: "image/webp" }), thumbPath)
    return thumbPath
  } catch (error) {
    console.warn(`Thumbnail generation failed for ${storagePath}:`, error)
    return null
  }
}
