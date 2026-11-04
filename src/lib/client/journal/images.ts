import { createIsomorphicFn } from '@tanstack/react-start'
import { parseEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import { journalImageDigest } from '@/lib/journal-image-digest'
import * as remote from '@/lib/server/images'
import { uploadEntityImageBase64Schema } from '@/lib/server-validation'
import { compressJournalImage } from '../image-compression'
import { journalWrite } from '../journal-function'
import { getClientJournal, writeLocalJournal } from '../local-journal'

export type { EntityType } from '@/lib/server/images'
export const uploadEntityImage = createIsomorphicFn()
  .server(remote.uploadEntityImage)
  .client(async ({ data }: { data: FormData }) => {
    const input = parseEntityImageUploadFormData(data)
    const files = await compressJournalImage(input.file)
    const digest = await journalImageDigest(files)
    const result = await writeLocalJournal('images/uploadEntityImage', {
      entityType: input.entityType,
      entityId: input.entityId,
      filename: input.filename,
      files,
      digest,
    })
    return result as Awaited<ReturnType<typeof remote.uploadEntityImage>>
  })
export const uploadEntityImageBase64 = createIsomorphicFn()
  .server(remote.uploadEntityImageBase64)
  .client(
    async ({
      data,
    }: {
      data: Parameters<typeof remote.uploadEntityImageBase64>[0]['data']
    }) => {
      const input = uploadEntityImageBase64Schema.parse(data)
      const bytes = Uint8Array.from(atob(input.fileBase64), (character) =>
        character.charCodeAt(0),
      )
      if (bytes.byteLength !== input.sizeBytes)
        throw new Error('Image size does not match the uploaded data')
      const form = new FormData()
      form.set('entityType', input.entityType)
      form.set('entityId', String(input.entityId))
      form.set(
        'file',
        new File([bytes], input.filename, { type: input.mimeType }),
      )
      return uploadEntityImage({ data: form })
    },
  )
export const deleteEntityImage = journalWrite(
  remote.deleteEntityImage,
  'images/deleteEntityImage',
)
export const setImageAsThumbnail = journalWrite(
  remote.setImageAsThumbnail,
  'images/setImageAsThumbnail',
)
export const getImageUploadPolicy = createIsomorphicFn()
  .server(remote.getImageUploadPolicy)
  .client(async () => (await (await getClientJournal()).read()).policy)
