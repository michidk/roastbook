import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import type { EntityType } from '@/journal/images'
import { notifyLocalChange } from '@/journal/local/changes'
import {
  hasUnsyncedChanges,
  keepsDeviceCopy,
} from '@/journal/local/device-copy'
import { getSyncStatus } from '@/journal/local/sync-status'
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

export async function beautifyEntityImage(data: ImageSelection) {
  const key = beautifyKey(data.entityType, data.imageId)
  if (beautifying.has(key)) return
  markBeautifying(key, true)
  const toastId = toast.loading('Beautifying picture…', {
    description: 'You can keep using Roastbook. Keep this tab open.',
  })
  try {
    const result = await runBeautify(data)
    if (result === 'already-beautified') {
      toast.info('This picture is already beautified.', {
        id: toastId,
        description: 'Your original is still available.',
      })
    } else if (result === 'sync-pending') {
      toast.warning('Picture beautified. Refresh to see the result.', {
        id: toastId,
        description:
          'Your edit is saved on the server. No need to beautify again.',
      })
    } else {
      toast.success('Picture beautified.', {
        id: toastId,
        description: 'Your original is still available.',
      })
    }
  } catch (error) {
    toast.error('Couldn’t beautify this picture. Your original is safe.', {
      id: toastId,
      description: getErrorMessage(
        error,
        'Try again from the picture gallery.',
      ),
    })
  } finally {
    markBeautifying(key, false)
  }
}

async function runBeautify(data: ImageSelection) {
  if (DEMO_MODE || !isConnectionOnline()) {
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
  const edited = await prepareBeautifiedImage({ data })
  try {
    if (keepsDeviceCopy()) {
      const { synchronizeEditionJournal } = await import(
        '@/journal/local/edition'
      )
      await synchronizeEditionJournal()
      if (getSyncStatus().error || !isConnectionOnline()) return 'sync-pending'
    }
    await notifyLocalChange('write')
    return edited ? 'updated' : 'already-beautified'
  } catch {
    return 'sync-pending'
  }
}
