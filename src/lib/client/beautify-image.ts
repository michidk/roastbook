import { useSyncExternalStore } from 'react'
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
let beautifying: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()
export const beautifyKey = (entityType: EntityType, imageId: number) =>
  `${entityType}:${imageId}`
function markBeautifying(key: string, active: boolean) {
  const next = new Set(beautifying)
  if (active) next.add(key)
  else next.delete(key)
  beautifying = next
  for (const listener of listeners) listener()
}
/** Keys of pictures with an edit in flight, including background ones. */
export function useBeautifyingImages() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => beautifying,
    () => beautifying,
  )
}

export async function beautifyEntityImage(
  data: ImageSelection,
  automatic = false,
) {
  const key = beautifyKey(data.entityType, data.imageId)
  markBeautifying(key, true)
  try {
    await runBeautify(data, automatic)
  } finally {
    markBeautifying(key, false)
  }
}

async function runBeautify(data: ImageSelection, automatic: boolean) {
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

/** Runs in the background: an edit can take a minute, so the save never waits
 *  for it, and upload success stays success even when the optional edit fails. */
export function beautifyUploadedImage(data: ImageSelection) {
  void beautifyEntityImage(data, true).catch((error: unknown) => {
    toast.error(
      getErrorMessage(
        error,
        'Picture saved. Beautification failed. Retry from the picture gallery.',
      ),
    )
  })
}
