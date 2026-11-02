import '@tanstack/react-start/server-only'
import { getSmallThumbnailPath, getThumbnailPath } from '@/lib/image-path'
import {
  createSmallThumbnail,
  createStoredImage,
  createThumbnail,
  validateImageBuffer,
} from '@/lib/thumbnail-image'

/** Generate every stored byte before quota admission or object storage writes. */
export async function prepareStoredImage(
  buffer: Buffer,
  mimeType: string,
  storagePath: string,
) {
  await validateImageBuffer(buffer, mimeType)
  const original = await createStoredImage(buffer)
  const thumbnail = await createThumbnail(original)
  const smallThumbnail = await createSmallThumbnail(original)
  const files = [
    { path: storagePath, buffer: original },
    { path: getThumbnailPath(storagePath), buffer: thumbnail },
    { path: getSmallThumbnailPath(storagePath), buffer: smallThumbnail },
  ]
  return {
    files,
    sizeBytes: original.byteLength,
    storageBytes: files.reduce((sum, file) => sum + file.buffer.byteLength, 0),
  }
}
