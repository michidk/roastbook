import '@tanstack/react-start/server-only'
import { isBeautified } from '@/journal/domain/beautified-image'
import {
  imageStoragePolicy,
  loadImageStorageUsage,
  measureLegacyImageStorage,
} from '@/journal/domain/image-storage'
import { withResourceLimits } from '@/journal/domain/resource-limits'
import { saveBeautifiedImage } from '@/journal/images'
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
  // Older clients may still send the retired automatic-upload preference.
  if (data.automatic) return null
  const { image, beautified } = await isBeautified(data)
  if (beautified) return null
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
