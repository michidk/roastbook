import { createEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import type { ImageFile } from '@/lib/image-file'
import { isImageUploadNetworkError } from '@/lib/image-upload-error'
import {
  type EntityType,
  uploadEntityImage,
  uploadEntityImageBase64,
} from '@/lib/server/images'

export type EntityImageUploadFailure = {
  readonly image: ImageFile
  readonly error: unknown
}

export type EntityImageUploadResult = {
  readonly uploaded: readonly ImageFile[]
  readonly failures: readonly EntityImageUploadFailure[]
}

type UploadImage = (input: { data: FormData }) => Promise<unknown>

type UploadBase64Image = (input: {
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
  uploadBase64Image?: UploadBase64Image,
): Promise<EntityImageUploadResult> {
  const uploaded: ImageFile[] = []
  const failures: EntityImageUploadFailure[] = []

  for (const image of images) {
    try {
      await uploadImage({
        data: createEntityImageUploadFormData(entityType, entityId, image.file),
      })
      uploaded.push(image)
    } catch (error) {
      if (uploadBase64Image && isImageUploadNetworkError(error)) {
        try {
          await uploadBase64Image({
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
          continue
        } catch (fallbackError) {
          failures.push({ image, error: fallbackError })
          continue
        }
      }
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
  return uploadEntityImagesWith(
    uploadEntityImage,
    entityType,
    entityId,
    images,
    uploadEntityImageBase64,
  )
}
