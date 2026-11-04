import { createServerFn } from '@tanstack/react-start'
import { withResourceLimits } from '@/journal/domain/resource-limits'
import {
  imageFilenameSchema,
  imageMimeTypeSchema,
  MAX_IMAGE_BYTES,
} from '@/lib/server-validation'

/** Server encoding for pictures the browser cannot decode, such as HEIC. */
export const convertPicture = createServerFn({ method: 'POST' })
  .validator((input: FormData) => {
    const file = input.get('file')
    if (!(file instanceof File)) throw new Error('Choose a picture to convert')
    imageFilenameSchema.parse(file.name)
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES)
      throw new Error('The image must be smaller than 10 MB')
    return { file, mimeType: imageMimeTypeSchema.parse(file.type) }
  })
  .handler(({ data }) =>
    withResourceLimits('picture-conversion', async () => {
      const { convertPicture } = await import('./pictures.server')
      return convertPicture(
        new Uint8Array(await data.file.arrayBuffer()),
        data.mimeType,
      )
    }),
  )
