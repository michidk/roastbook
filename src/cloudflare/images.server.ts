import '@tanstack/react-start/server-only'
import type { ImagesBinding } from '@cloudflare/workers-types'
import { createServerOnlyFn } from '@tanstack/react-start'
import { MAX_IMAGE_BYTES } from '@/lib/server-validation'
import { requireCloudflareRuntime } from './context.server'

function source(buffer: Uint8Array): Parameters<ImagesBinding['info']>[0] {
  // Workers implements the Web Streams API. Its declaration additionally exposes
  // a BYOB extension missing from TypeScript's DOM declarations.
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(buffer)
      controller.close()
    },
  }) as unknown as Parameters<ImagesBinding['info']>[0]
}
export const validateImageBuffer = createServerOnlyFn(
  async (buffer: Buffer, mimeType: string): Promise<void> => {
    if (!buffer.byteLength || buffer.byteLength > MAX_IMAGE_BYTES)
      throw new Error('The image must be smaller than 10 MB')
    const metadata = await requireCloudflareRuntime().bindings.IMAGES.info(
      source(buffer),
    )
    if (
      ![
        'image/avif',
        'image/gif',
        'image/heic',
        'image/heif',
        'image/jpeg',
        'image/png',
        'image/webp',
      ].includes(mimeType) ||
      metadata.format !== mimeType
    )
      throw new Error('The file contents do not match the selected image type')
    if (
      !('width' in metadata) ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > 12000 ||
      metadata.height > 12000
    )
      throw new Error('The image dimensions are unsupported')
  },
)
async function transform(
  buffer: Buffer,
  width: number,
  quality: number,
  format: 'image/webp' | 'image/jpeg',
  height?: number,
): Promise<Buffer> {
  const result = await requireCloudflareRuntime()
    .bindings.IMAGES.input(source(buffer))
    .transform({ width, height, fit: 'scale-down' })
    .output({ format, quality, anim: false })
  const reader = result.image().getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.length
      if (size > MAX_IMAGE_BYTES)
        throw new Error('Transformed image exceeds size limit')
      chunks.push(chunk.value)
    }
  } finally {
    await reader.cancel()
    reader.releaseLock()
  }
  return Buffer.concat(chunks, size)
}
export const createThumbnail = createServerOnlyFn((buffer: Buffer) =>
  transform(buffer, 640, 78, 'image/webp'),
)
export const createSmallThumbnail = createServerOnlyFn((buffer: Buffer) =>
  transform(buffer, 128, 72, 'image/webp'),
)
export const createStoredImage = createServerOnlyFn((buffer: Buffer) =>
  transform(buffer, 1600, 80, 'image/webp', 1600),
)
export const createAiImage = createServerOnlyFn((buffer: Buffer) =>
  transform(buffer, 2048, 85, 'image/jpeg', 2048),
)
