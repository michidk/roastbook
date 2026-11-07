import '@tanstack/react-start/server-only'
import { eq } from 'drizzle-orm'
import { isBeautified } from '@/journal/domain/beautified-image'
import { entityImageTarget } from '@/journal/domain/entity-image-records'
import {
  imageStoragePolicy,
  loadImageStorageUsage,
  measureLegacyImageStorage,
} from '@/journal/domain/image-storage'
import { withResourceLimits } from '@/journal/domain/resource-limits'
import { loadAppSettings } from '@/journal/domain/settings'
import { saveBeautifiedImage } from '@/journal/images'
import { db, owned } from '@/journal/platform/database'
import { DEMO_MODE } from '@/lib/build-mode'
import { beautifyImageBytes } from '@/lib/server/ai-image-edit.server'
import { getStorage } from '@/lib/storage'

type ImageSelection = Parameters<typeof isBeautified>[0] & {
  automatic: boolean
}

export async function prepareEntityImageBeautification(
  data: ImageSelection,
  edit = beautifyImageBytes,
) {
  if (DEMO_MODE)
    throw new Error('Image beautification is unavailable in the demo')
  const { image, beautified } = await isBeautified(data)
  if (beautified) return null
  if (data.automatic) {
    if (!(await loadAppSettings()).beautifyImages) return null
    const { table, foreignKey } = entityImageTarget(data.entityType)
    const images = await db
      .select()
      .from(table)
      .where(owned(table, eq(foreignKey, data.entityId)))
      .orderBy(table.id)
    const primary =
      images.find(
        (candidate) => 'isThumbnail' in candidate && candidate.isThumbnail,
      ) ?? images[0]
    if (primary?.id !== image.id) return null
  }
  await measureLegacyImageStorage()
  const policy = imageStoragePolicy()
  const usage = await loadImageStorageUsage()
  if (
    policy.limitBytes !== null &&
    (usage.unmeasuredImages || usage.totalBytes >= policy.limitBytes)
  )
    throw new Error(
      'Image storage is full or still being measured. Check Settings > Storage before beautifying.',
    )
  const original = await getStorage().download(image.storagePath)
  const edited = await withResourceLimits('image-beautification', async () =>
    edit(
      new Uint8Array(await original.arrayBuffer()),
      image.mimeType ?? 'image/webp',
    ),
  )
  return saveBeautifiedImage({
    data: {
      entityType: data.entityType,
      entityId: data.entityId,
      imageId: data.imageId,
      imageBase64: Buffer.from(edited.binaryData).toString('base64'),
      mimeType: edited.mimeType,
    },
  })
}
