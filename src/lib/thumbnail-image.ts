import { createServerOnlyFn } from '@tanstack/react-start'
import { type PictureSize, pictureSizes } from '@/lib/picture-sizes'
import { MAX_IMAGE_BYTES } from '@/lib/server-validation'

const IMAGE_FORMAT_BY_MIME_TYPE: Readonly<Record<string, readonly string[]>> = {
  'image/avif': ['avif', 'heif'],
  'image/gif': ['gif'],
  'image/heic': ['heif'],
  'image/heif': ['heif'],
  'image/jpeg': ['jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
}

type SharpFactory = typeof import('sharp').default
let sharpFactoryPromise: Promise<SharpFactory> | undefined

export function loadSharp(): Promise<SharpFactory> {
  sharpFactoryPromise ??= import('sharp').then(({ default: sharp }) => {
    // Image extraction is bursty and runs in a memory-constrained web process.
    // Do not retain decoded image buffers after the request completes, and keep
    // libvips from multiplying peak memory through parallel operations.
    sharp.cache(false)
    sharp.concurrency(1)
    return sharp
  })
  return sharpFactoryPromise
}

const validateImageBufferImpl = async (
  buffer: Buffer,
  mimeType: string,
): Promise<{ width: number; height: number }> => {
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error('The image must be smaller than 10 MB')
  }

  const sharp = await loadSharp()
  const metadata = await sharp(buffer).metadata()
  const allowedFormats = IMAGE_FORMAT_BY_MIME_TYPE[mimeType]
  if (!metadata.format || !allowedFormats?.includes(metadata.format)) {
    throw new Error('The file contents do not match the selected image type')
  }

  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width > 12_000 ||
    metadata.height > 12_000 ||
    metadata.width * metadata.height > 50_000_000
  ) {
    throw new Error('The image dimensions are unsupported')
  }
  return { width: metadata.width, height: metadata.height }
}

export const validateImageBuffer = createServerOnlyFn(validateImageBufferImpl)

async function encode(buffer: Buffer, size: PictureSize): Promise<Buffer> {
  const { maxDimension, quality } = pictureSizes[size]
  const sharp = await loadSharp()
  return sharp(buffer)
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer()
}

export const createStoredImage = createServerOnlyFn((buffer: Buffer) =>
  encode(buffer, 'stored'),
)
export const createThumbnail = createServerOnlyFn((buffer: Buffer) =>
  encode(buffer, 'thumbnail'),
)
export const createSmallThumbnail = createServerOnlyFn((buffer: Buffer) =>
  encode(buffer, 'small'),
)
