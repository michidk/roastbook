import {
  imageFilenameSchema,
  imageMimeTypeSchema,
  MAX_IMAGE_BYTES,
} from '@/lib/server-validation'

export async function compressJournalImage(file: File): Promise<string[]> {
  imageFilenameSchema.parse(file.name)
  imageMimeTypeSchema.parse(file.type)
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES)
    throw new Error('The image must be smaller than 10 MB')
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(
      'This browser cannot decode this picture. Choose JPEG, PNG, or WebP.',
    )
  })
  try {
    if (
      bitmap.width > 12000 ||
      bitmap.height > 12000 ||
      bitmap.width * bitmap.height > 50_000_000
    )
      throw new Error('The image dimensions are unsupported')
    return await Promise.all(
      [
        { width: 1600, quality: 0.8 },
        { width: 640, quality: 0.78 },
        { width: 128, quality: 0.72 },
      ].map(async ({ width, quality }) => {
        const blob = await resizeBrowserImage(bitmap, width, quality)
        const bytes = new Uint8Array(await blob.arrayBuffer())
        let binary = ''
        for (const byte of bytes) binary += String.fromCharCode(byte)
        return btoa(binary)
      }),
    )
  } finally {
    bitmap.close()
  }
}

/** Canvas encoding shared by the image picker and durable journal uploads. */
export async function resizeBrowserImage(
  bitmap: ImageBitmap,
  maxDimension: number,
  quality: number,
): Promise<Blob> {
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height),
  )
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context)
    throw new Error('Image processing is unavailable in this browser')
  context.drawImage(bitmap, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality),
  )
  if (blob?.type !== 'image/webp')
    throw new Error(
      'This browser cannot save WebP pictures. Try a current browser.',
    )
  return blob
}
