import { type PictureSize, pictureSizes } from '@/lib/picture-sizes'

/** Canvas encoding shared by the picture picker and the browser journal. */
export async function encodePicture(
  bitmap: ImageBitmap,
  size: PictureSize,
): Promise<Blob> {
  const { maxDimension, quality } = pictureSizes[size]
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
    canvas.toBlob(resolve, 'image/webp', quality / 100),
  )
  if (blob?.type !== 'image/webp')
    throw new Error(
      'This browser cannot save WebP pictures. Try a current browser.',
    )
  return blob
}

/** The stored picture and its thumbnails, as the journal keeps them. */
export type PreparedPicture = {
  readonly file: File
  readonly thumbnail: File
  readonly small: File
}

/**
 * Encodes a chosen picture once, in its final sizes. Returns nothing when this
 * browser cannot decode it (HEIC outside Safari, for example).
 */
export async function preparePicture(
  file: File,
): Promise<PreparedPicture | undefined> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  }).catch(() => undefined)
  if (!bitmap) return undefined
  try {
    const name = file.name.replace(/\.[^.]+$/, '') || 'picture'
    const encode = async (size: PictureSize, suffix: string) =>
      new File([await encodePicture(bitmap, size)], `${name}${suffix}.webp`, {
        type: 'image/webp',
        lastModified: file.lastModified,
      })
    return {
      file: await encode('stored', ''),
      thumbnail: await encode('thumbnail', '.thumb'),
      small: await encode('small', '.small'),
    }
  } finally {
    bitmap.close()
  }
}
