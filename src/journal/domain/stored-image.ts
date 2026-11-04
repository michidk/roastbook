import {
  createSmallThumbnail,
  createStoredImage,
  createThumbnail,
  validateImageBuffer,
} from '@/journal/platform/images'
import { getSmallThumbnailPath, getThumbnailPath } from '@/lib/image-path'
import { type PictureSize, pictureSizes } from '@/lib/picture-sizes'

export type PreparedSizes = {
  readonly thumbnail: Uint8Array
  readonly small: Uint8Array
}

/** Encoded sizes are stored as they are, after checking each one. */
async function checkPrepared(bytes: Uint8Array, size: PictureSize) {
  const { width, height } = await validateImageBuffer(bytes, 'image/webp')
  if (Math.max(width, height) > pictureSizes[size].maxDimension)
    throw new Error('The prepared picture is larger than allowed')
  return bytes
}

/**
 * Generate every stored byte before quota admission or object storage writes.
 * A WebP picture that comes with its thumbnails was encoded by the browser and
 * is kept unchanged; anything else is encoded here.
 */
export async function prepareStoredImage(
  buffer: Uint8Array,
  mimeType: string,
  storagePath: string,
  sizes?: PreparedSizes,
) {
  let original: Uint8Array
  let thumbnail: Uint8Array
  let smallThumbnail: Uint8Array
  if (sizes) {
    if (mimeType !== 'image/webp')
      throw new Error('Prepared pictures must be WebP')
    original = await checkPrepared(buffer, 'stored')
    thumbnail = await checkPrepared(sizes.thumbnail, 'thumbnail')
    smallThumbnail = await checkPrepared(sizes.small, 'small')
  } else {
    await validateImageBuffer(buffer, mimeType)
    original = await createStoredImage(buffer)
    thumbnail = await createThumbnail(original)
    smallThumbnail = await createSmallThumbnail(original)
  }
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
