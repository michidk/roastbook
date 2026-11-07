import { toast } from 'sonner'
import type { EntityType } from '@/journal/images'
import { notifyLocalChange } from '@/journal/local/changes'
import {
  hasUnsyncedChanges,
  keepsDeviceCopy,
} from '@/journal/local/device-copy'
import { DEMO_MODE } from '@/lib/build-mode'
import { isConnectionOnline } from '@/lib/connection-status'
import { getErrorMessage } from '@/lib/error-message'
import { prepareBeautifiedImage } from '@/lib/server/beautify-image'

type ImageSelection = {
  entityType: EntityType
  entityId: number
  imageId: number
}
export async function beautifyEntityImage(
  data: ImageSelection,
  automatic = false,
) {
  if (DEMO_MODE || !isConnectionOnline()) {
    if (automatic) return
    throw new Error('Connect to the server to beautify this picture')
  }
  if (keepsDeviceCopy() && hasUnsyncedChanges()) {
    const { synchronizeEditionJournal } = await import(
      '@/journal/local/edition'
    )
    await synchronizeEditionJournal()
    if (hasUnsyncedChanges())
      throw new Error(
        'Picture saved on this device. Finish syncing, then use Beautify in the gallery.',
      )
  }
  const edited = await prepareBeautifiedImage({ data: { ...data, automatic } })
  if (!edited) return
  if (keepsDeviceCopy()) {
    const { synchronizeEditionJournal } = await import(
      '@/journal/local/edition'
    )
    await synchronizeEditionJournal()
  }
  await notifyLocalChange('write')
}

/** Upload success stays success even when the optional paid edit fails. */
export async function beautifyUploadedImage(data: ImageSelection) {
  try {
    await beautifyEntityImage(data, true)
  } catch (error) {
    toast.error(
      getErrorMessage(
        error,
        'Picture saved. Beautification failed. Retry from the picture gallery.',
      ),
    )
  }
}
