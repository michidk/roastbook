import type { ClientJournal } from '@roastbook/journal-client/journal'
import {
  awaitJournalRevision,
  journalCollection,
  journalQuery,
} from '@roastbook/journal-client/queries'
import { z } from 'zod'
import { DEMO_MODE } from '@/lib/build-mode'
import { openEditionJournal, resetEditionJournal } from '@/lib/edition-journal'
import { getOfflineOwner, registerOwnerCleanup } from '@/lib/journal-owner'
import {
  executeCommand,
  type JournalCommandOperation,
} from '@/modules/journal/commands'
import { type JournalReadOperation, readJournal } from '@/modules/journal/reads'
import { journalDates, storedValues } from '@/modules/journal/serialization'
import { localAppSettings } from '@/modules/journal/settings'

let collection: ReturnType<typeof journalCollection> | undefined
const listeners = new Set<() => void>()
let unsubscribe: (() => void) | undefined
let active: ClientJournal | undefined
let synchronizing: Promise<void> | undefined
const mediaUrls = new Map<string, { data: string; url: string }>()

export async function getClientJournal() {
  const journal = await openEditionJournal(executeCommand)
  if (active !== journal) {
    unsubscribe?.()
    active = journal
    collection = journalCollection(journal)
    unsubscribe = journal.subscribe((state) => {
      const live = new Set(Object.keys(state.media))
      for (const [path, entry] of mediaUrls)
        if (!live.has(path)) {
          URL.revokeObjectURL(entry.url)
          mediaUrls.delete(path)
        }
      for (const [path, file] of Object.entries(state.media))
        if (mediaUrls.get(path)?.data !== file.data) {
          const previous = mediaUrls.get(path)
          if (previous) URL.revokeObjectURL(previous.url)
          const blob = new Blob(
            [
              Uint8Array.from(atob(file.data), (character) =>
                character.charCodeAt(0),
              ),
            ],
            { type: file.mimeType },
          )
          mediaUrls.set(path, {
            data: file.data,
            url: URL.createObjectURL(blob),
          })
        }
      for (const listener of listeners) listener()
    })
  }
  return journal
}
export async function readLocalJournal(
  operation: JournalReadOperation | 'app-settings/getAppSettings',
  input?: unknown,
) {
  const journal = await getClientJournal()
  const state = await journal.read()
  if (operation === 'app-settings/getAppSettings') {
    const settings = state.tables.settings[0]
    if (!settings) throw new Error('Journal settings unavailable')
    return {
      ...localAppSettings(settings, DEMO_MODE),
      journalOwner: DEMO_MODE ? 'local' : getOfflineOwner(),
      account: state.account,
    }
  }
  if (!collection)
    throw new Error('The journal query collection is unavailable')
  await awaitJournalRevision(collection, state.revision)
  const query = journalQuery(collection, (current) =>
    readJournal(current, operation, input),
  )
  try {
    await query.preload()
    return [...query.values()][0]?.value
  } finally {
    await query.cleanup()
  }
}
export async function writeLocalJournal(
  operation: JournalCommandOperation,
  input: unknown,
) {
  if (!DEMO_MODE) {
    const { assertEarlierChangesResolved } = await import(
      '@/modules/offline/legacy-recovery'
    )
    await assertEarlierChangesResolved()
  }
  const journal = await getClientJournal()
  const result = await journal.command(
    operation,
    z.json().parse(storedValues(input ?? null)),
  )
  void synchronizeJournal().catch(() => undefined)
  if (operation.startsWith('settings/'))
    return readLocalJournal('app-settings/getAppSettings')
  return journalDates(result)
}
export function subscribeJournalChanges(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function localJournalImageUrl(path: string) {
  return mediaUrls.get(path)?.url ?? ''
}
export async function resetLocalDemo() {
  if (!DEMO_MODE) throw new Error('Reset is only available in the demo')
  await resetEditionJournal()
}
export function synchronizeJournal() {
  if (DEMO_MODE || typeof navigator === 'undefined' || !navigator.onLine)
    return Promise.resolve()
  synchronizing ??= Promise.resolve()
    .then(async () => {
      const { hasEarlierPendingChanges } = await import(
        '@/modules/offline/legacy-recovery'
      )
      if (await hasEarlierPendingChanges()) return
      await (await getClientJournal()).synchronize()
    })
    .finally(() => {
      synchronizing = undefined
    })
  return synchronizing
}
registerOwnerCleanup(async () => {
  unsubscribe?.()
  unsubscribe = undefined
  await collection?.cleanup()
  collection = undefined
  active = undefined
  for (const entry of mediaUrls.values()) URL.revokeObjectURL(entry.url)
  mediaUrls.clear()
})
