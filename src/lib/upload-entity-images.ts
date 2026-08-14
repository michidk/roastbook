import type { ImageFile } from '@/hooks/useImageUpload'
import { type EntityType, uploadEntityImage } from '@/lib/server/images'

export type EntityImageUploadFailure = {
  readonly image: ImageFile
  readonly error: unknown
}

export type EntityImageUploadResult = {
  readonly uploaded: readonly ImageFile[]
  readonly failures: readonly EntityImageUploadFailure[]
}

type UploadImage = (input: {
  data: {
    entityType: EntityType
    entityId: number
    fileBase64: string
    filename: string
    mimeType: string
    sizeBytes: number
  }
}) => Promise<unknown>

export async function uploadEntityImagesWith(
  uploadImage: UploadImage,
  entityType: EntityType,
  entityId: number,
  images: readonly ImageFile[],
): Promise<EntityImageUploadResult> {
  const uploaded: ImageFile[] = []
  const failures: EntityImageUploadFailure[] = []

  for (const image of images) {
    try {
      await uploadImage({
        data: {
          entityType,
          entityId,
          fileBase64: image.base64,
          filename: image.file.name,
          mimeType: image.file.type,
          sizeBytes: image.file.size,
        },
      })
      uploaded.push(image)
    } catch (error) {
      failures.push({ image, error })
    }
  }

  return { uploaded, failures }
}

export async function uploadEntityImages(
  entityType: EntityType,
  entityId: number,
  images: readonly ImageFile[],
): Promise<EntityImageUploadResult> {
  return uploadEntityImagesWith(uploadEntityImage, entityType, entityId, images)
}
