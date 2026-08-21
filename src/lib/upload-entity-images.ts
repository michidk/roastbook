import type { ImageFile } from '@/hooks/useImageUpload'
import { createEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import { getErrorMessage } from '@/lib/error-message'
import { type EntityType, uploadEntityImage } from '@/lib/server/images'

export type EntityImageUploadFailure = {
  readonly image: ImageFile
  readonly error: unknown
}

export type EntityImageUploadResult = {
  readonly uploaded: readonly ImageFile[]
  readonly failures: readonly EntityImageUploadFailure[]
}

export function getEntityImageUploadFailureMessage(
  failures: readonly EntityImageUploadFailure[],
): string | null {
  const firstFailure = failures[0]
  if (!firstFailure) return null

  const reason = getErrorMessage(firstFailure.error, 'The server rejected it')
  const filename = firstFailure.image.file.name

  if (failures.length === 1) {
    return `Upload failed for ${filename}: ${reason}`
  }

  return `Could not upload ${failures.length} pictures. First failure — ${filename}: ${reason}`
}

type UploadImage = (input: { data: FormData }) => Promise<unknown>

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
        data: createEntityImageUploadFormData(entityType, entityId, image.file),
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
