import type { z } from 'zod'
import { aiImageInputsSchema } from '@/lib/server-validation'
import { loadSharp, validateImageBuffer } from '@/lib/thumbnail-image'

type AiImageInput = z.infer<typeof aiImageInputsSchema>[number]
export type PreparedAiImage = {
  readonly bytes: Buffer
  readonly mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  readonly width: number
  readonly height: number
}

export async function prepareAiImages(
  inputs: readonly AiImageInput[],
): Promise<readonly PreparedAiImage[]> {
  const validated = aiImageInputsSchema.parse(inputs)
  const prepared: PreparedAiImage[] = []
  let totalBytes = 0
  const sharp = await loadSharp()
  for (const input of validated) {
    const bytes = Buffer.from(input.imageBase64, 'base64')
    const { width, height } = await validateImageBuffer(bytes, input.mimeType)
    const pipeline = sharp(bytes, {
      failOn: 'warning',
      limitInputPixels: 50_000_000,
    })
    const metadata = await pipeline.metadata()
    if ((metadata.pages ?? 1) > 1)
      throw new Error(
        'Choose a still image instead of an animated or multipage image.',
      )
    const mimeType = input.mimeType
    const supported =
      mimeType === 'image/jpeg' ||
      mimeType === 'image/png' ||
      mimeType === 'image/webp'
    let image: PreparedAiImage
    if (
      supported &&
      width <= 2048 &&
      height <= 2048 &&
      !metadata.exif &&
      !metadata.xmp &&
      !metadata.iptc &&
      (!metadata.orientation || metadata.orientation === 1)
    ) {
      // Metadata alone does not prove the compressed pixel data is intact.
      await pipeline.stats()
      image = { bytes, mimeType, width, height }
    } else {
      const { data, info } = await pipeline
        .rotate()
        .resize({
          width: 2048,
          height: 2048,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer({ resolveWithObject: true })
      image = {
        bytes: data,
        mimeType: 'image/jpeg',
        width: info.width,
        height: info.height,
      }
    }
    totalBytes += image.bytes.byteLength
    if (totalBytes > 32 * 1024 * 1024)
      throw new Error(
        'These images exceed the 32 MiB analysis limit. Choose fewer or smaller images.',
      )
    prepared.push(image)
  }
  return prepared
}
