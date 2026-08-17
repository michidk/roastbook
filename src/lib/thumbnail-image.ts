import { createServerOnlyFn } from '@tanstack/react-start'
import { MAX_IMAGE_BYTES } from '@/lib/server-validation'

export { getThumbnailPath } from '@/lib/image-path'

const THUMB_WIDTH = 640
const THUMB_QUALITY = 78

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

function loadSharp(): Promise<SharpFactory> {
  sharpFactoryPromise ??= import('sharp').then(({ default: sharp }) => sharp)
  return sharpFactoryPromise
}

const validateImageBufferImpl = async (
  buffer: Buffer,
  mimeType: string,
): Promise<void> => {
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
    metadata.height > 12_000
  ) {
    throw new Error('The image dimensions are unsupported')
  }
}

export const validateImageBuffer = createServerOnlyFn(validateImageBufferImpl)

export const createThumbnail = createServerOnlyFn(
  async (buffer: Buffer): Promise<Buffer> => {
    const sharp = await loadSharp()
    return sharp(buffer)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer()
  },
)
