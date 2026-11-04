import '@tanstack/react-start/server-only'
import {
  createSmallThumbnail,
  createStoredImage,
  createThumbnail,
  validateImageBuffer,
} from '@/lib/thumbnail-image'

/** Encodes a picture the browser could not decode into the stored sizes. */
export async function convertPicture(bytes: Uint8Array, mimeType: string) {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  try {
    await validateImageBuffer(buffer, mimeType)
    const stored = await createStoredImage(buffer)
    return {
      stored: stored.toString('base64'),
      thumbnail: (await createThumbnail(stored)).toString('base64'),
      small: (await createSmallThumbnail(stored)).toString('base64'),
    }
  } catch {
    throw new Error(
      'This picture format cannot be read here. Choose a JPEG, PNG or WebP picture.',
    )
  }
}
