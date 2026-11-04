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
  sizes?: { readonly thumbnail: File; readonly small: File },
): FormData {
  const formData = new FormData()
  formData.set('entityType', entityType)
  formData.set('entityId', String(entityId))
  formData.set('file', file, file.name)
  if (sizes) {
    formData.set('thumbnail', sizes.thumbnail, sizes.thumbnail.name)
    formData.set('small', sizes.small, sizes.small.name)
  }
  return formData
}

/** Thumbnails the browser already encoded; both or neither. */
function preparedSizes(formData: FormData) {
  const thumbnail = formData.get('thumbnail')
  const small = formData.get('small')
  if (thumbnail === null && small === null) return undefined
  for (const size of [thumbnail, small])
    if (
      !(size instanceof File) ||
      size.type !== 'image/webp' ||
      size.size === 0 ||
      size.size > MAX_IMAGE_BYTES
    )
      throw new Error('The prepared picture sizes are invalid')
  return { thumbnail: thumbnail as File, small: small as File }
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
    sizes: preparedSizes(formData),
  }
}
