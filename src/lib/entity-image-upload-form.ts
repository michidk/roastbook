import { z } from 'zod'
import {
  entityTypeSchema,
  imageFilenameSchema,
  imageMimeTypeSchema,
  MAX_IMAGE_BYTES,
  positiveIdSchema,
} from '@/lib/server-validation'

export function createEntityImageUploadFormData(
  entityType: string,
  entityId: number,
  file: File,
): FormData {
  const formData = new FormData()
  formData.set('entityType', entityType)
  formData.set('entityId', String(entityId))
  formData.set('file', file, file.name)
  return formData
}

export function parseEntityImageUploadFormData(formData: FormData) {
  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('Choose an image file to upload')

  return {
    entityType: entityTypeSchema.parse(formData.get('entityType')),
    entityId: positiveIdSchema.parse(Number(formData.get('entityId'))),
    filename: imageFilenameSchema.parse(file.name),
    mimeType: imageMimeTypeSchema.parse(file.type),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(MAX_IMAGE_BYTES)
      .parse(file.size),
    file,
  }
}
