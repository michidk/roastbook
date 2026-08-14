import type { ImageFile } from '@/hooks/useImageUpload'
import { type EntityType, uploadEntityImage } from '@/lib/server/images'

export async function uploadEntityImages(
  entityType: EntityType,
  entityId: number,
  images: readonly ImageFile[],
): Promise<void> {
  for (const image of images) {
    await uploadEntityImage({
      data: {
        entityType,
        entityId,
        fileBase64: image.base64,
        filename: image.file.name,
        mimeType: image.file.type,
        sizeBytes: image.file.size,
      },
    })
  }
}
