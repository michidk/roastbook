// Browser platform: the browser decodes and encodes pictures with the same
// limits and output sizes as the server.
import { resizeBrowserImage } from '@/lib/client/image-compression'
import { MAX_IMAGE_BYTES } from '@/lib/server-validation'

async function decode(bytes: Uint8Array, type?: string) {
  return createImageBitmap(new Blob([bytes as BlobPart], { type })).catch(
    () => {
      throw new Error(
        'This browser cannot decode this picture. Choose JPEG, PNG, or WebP.',
      )
    },
  )
}

export async function validateImageBuffer(
  bytes: Uint8Array,
  mimeType: string,
): Promise<void> {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES)
    throw new Error('The image must be smaller than 10 MB')
  const bitmap = await decode(bytes, mimeType)
  try {
    if (
      bitmap.width > 12_000 ||
      bitmap.height > 12_000 ||
      bitmap.width * bitmap.height > 50_000_000
    )
      throw new Error('The image dimensions are unsupported')
  } finally {
    bitmap.close()
  }
}

async function resize(bytes: Uint8Array, width: number, quality: number) {
  const bitmap = await decode(bytes)
  try {
    const blob = await resizeBrowserImage(bitmap, width, quality)
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    bitmap.close()
  }
}

export const createStoredImage = (bytes: Uint8Array) => resize(bytes, 1600, 0.8)
export const createThumbnail = (bytes: Uint8Array) => resize(bytes, 640, 0.78)
export const createSmallThumbnail = (bytes: Uint8Array) =>
  resize(bytes, 128, 0.72)
