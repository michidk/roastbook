import { requireFeature } from '@/lib/app-capabilities'
import { createEntityImageUploadFormData } from '@/lib/entity-image-upload-form'
import type { ImageFile } from '@/lib/image-file'
import type { JournalMutationResult } from '@/modules/offline/mutation'
import type { EntityType } from './journal/images'
import {
  deleteEntityImage,
  setImageAsThumbnail,
  uploadEntityImage,
} from './journal/images'

type ImageTarget = {
  readonly entityType: EntityType
  readonly entityId: number
}
export async function addJournalPicture(
  target: ImageTarget,
  picture: ImageFile,
): Promise<
  JournalMutationResult<Awaited<ReturnType<typeof uploadEntityImage>>>
> {
  requireFeature('journal-write')
  return {
    kind: 'saved',
    value: await uploadEntityImage({
      data: createEntityImageUploadFormData(
        target.entityType,
        target.entityId,
        picture.file,
      ),
    }),
  } as const
}
export async function removeJournalPicture(
  target: ImageTarget & { readonly imageId: number },
): Promise<JournalMutationResult<void>> {
  requireFeature('journal-write')
  return {
    kind: 'saved',
    value: await deleteEntityImage({ data: { ...target, idempotent: true } }),
  } as const
}
export function chooseJournalThumbnail(target: {
  readonly entityType: 'bean-purchases' | 'gear'
  readonly entityId: number
  readonly imageId: number
}) {
  requireFeature('journal-write')
  return setImageAsThumbnail({ data: target })
}
