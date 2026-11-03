import { requireFeature } from '@/lib/app-capabilities'
import { DEMO_MODE } from '@/lib/build-mode'
import { isConnectionOnline } from '@/lib/connection-status'
import { createEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import type { ImageFile } from '@/lib/image-file'
import { isImageUploadNetworkError } from '@/lib/image-upload-error'
import {
  deleteEntityImage,
  setImageAsThumbnail,
  uploadEntityImage,
  uploadEntityImageBase64,
} from '@/lib/server/images'
import {
  enqueueImageDelete,
  enqueueImageUpload,
  type OfflineImageEntityType,
} from '@/modules/offline/entity-operations'
import { runJournalMutation } from '@/modules/offline/mutation'

type ImageTarget = {
  readonly entityType: OfflineImageEntityType
  readonly entityId: number
}

export async function addJournalPicture(
  target: ImageTarget,
  picture: ImageFile,
) {
  requireFeature(
    DEMO_MODE || target.entityType === 'shots'
      ? 'journal-write'
      : 'server-write',
    { online: isConnectionOnline() },
  )
  const clientOperationId = crypto.randomUUID()
  const send = () =>
    uploadEntityImage({
      data: createEntityImageUploadFormData(
        target.entityType,
        target.entityId,
        picture.file,
        clientOperationId,
      ),
    })
  if (target.entityType === 'shots') {
    return runJournalMutation({
      send,
      enqueue: () =>
        enqueueImageUpload({
          ...target,
          file: picture.file,
          clientOperationId,
          details: { label: 'Brew', detail: picture.file.name },
        }),
    })
  }
  try {
    return { kind: 'saved', value: await send() } as const
  } catch (error) {
    if (!isImageUploadNetworkError(error)) throw error
    return {
      kind: 'saved',
      value: await uploadEntityImageBase64({
        data: {
          ...target,
          fileBase64: picture.base64,
          filename: picture.file.name,
          mimeType: picture.file.type,
          sizeBytes: picture.file.size,
        },
      }),
    } as const
  }
}

export async function removeJournalPicture(
  target: ImageTarget & { readonly imageId: number },
) {
  requireFeature(
    DEMO_MODE || target.entityType === 'shots'
      ? 'journal-write'
      : 'server-write',
    { online: isConnectionOnline() },
  )
  const send = () =>
    deleteEntityImage({ data: { ...target, idempotent: true } })
  if (target.entityType === 'shots')
    return runJournalMutation({
      send,
      enqueue: () =>
        enqueueImageDelete({
          ...target,
          details: { label: 'Brew', detail: 'Remove picture' },
        }),
    })
  return { kind: 'saved', value: await send() } as const
}

export function chooseJournalThumbnail(target: {
  readonly entityType: 'bean-purchases' | 'gear'
  readonly entityId: number
  readonly imageId: number
}) {
  requireFeature(DEMO_MODE ? 'journal-write' : 'server-write', {
    online: isConnectionOnline(),
  })
  return setImageAsThumbnail({ data: target })
}
