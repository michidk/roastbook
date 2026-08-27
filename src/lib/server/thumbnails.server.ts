import { getSmallThumbnailPath, getThumbnailPath } from '@/lib/image-path'
import { getStorage } from '@/lib/storage'
import { createSmallThumbnail, createThumbnail } from '@/lib/thumbnail-image'

export async function generateAndUploadThumbnail(
  buffer: Buffer,
  storagePath: string,
): Promise<string | null> {
  try {
    const [thumbBuffer, smallThumbBuffer] = await Promise.all([
      createThumbnail(buffer),
      createSmallThumbnail(buffer),
    ])

    const thumbPath = getThumbnailPath(storagePath)
    const storage = getStorage()
    await storage.upload(
      new Blob([new Uint8Array(thumbBuffer)], { type: 'image/webp' }),
      thumbPath,
    )
    await storage.upload(
      new Blob([new Uint8Array(smallThumbBuffer)], { type: 'image/webp' }),
      getSmallThumbnailPath(storagePath),
    )
    return thumbPath
  } catch (error) {
    console.warn(`Thumbnail generation failed for ${storagePath}:`, error)
    return null
  }
}
