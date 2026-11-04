import {
  ClientJournal,
  type JournalExecutor,
  JournalSyncError,
} from '@roastbook/journal-client/journal'
import {
  journalTableMetadata,
  journalTableNames,
} from '@roastbook/journal-domain/model'
import type { JournalState } from '@roastbook/journal-domain/state'
import { journalStateSchema } from '@roastbook/journal-domain/state'
import { getOfflineOwner, registerOwnerCleanup } from '@/lib/journal-owner'
import {
  getJournalSnapshot,
  reserveJournalIdentifiers,
  sendJournalCommand,
} from '@/lib/server/journal-sync'

let opening: Promise<ClientJournal> | undefined
export function openEditionJournal(execute: JournalExecutor) {
  const owner = getOfflineOwner()
  const headers = { 'X-Roastbook-Owner': owner }
  const assertOwner = () => {
    if (getOfflineOwner() !== owner)
      throw new JournalSyncError(
        'auth-required',
        'The active account changed. Reopen the journal before syncing.',
      )
  }
  const snapshot = async (current?: JournalState) => {
    assertOwner()
    const remote = journalStateSchema.parse(
      await getJournalSnapshot({ headers }),
    )
    assertOwner()
    const result = await withIdentifiers(remote, owner, current)
    assertOwner()
    return result
  }
  opening ??= ClientJournal.open({
    name: `roastbook-journal-${Array.from(getOfflineOwner())
      .map((character) => character.codePointAt(0)?.toString(16))
      .join('_')}`,
    bootstrap: () => snapshot(),
    execute,
    transport: {
      load: snapshot,
      async send(command, revision) {
        try {
          assertOwner()
          const remote = journalStateSchema.parse(
            await sendJournalCommand({ data: { command, revision }, headers }),
          )
          assertOwner()
          return remote
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes('JOURNAL_CONFLICT')
          )
            throw new JournalSyncError(
              'conflict',
              error.message.replace('JOURNAL_CONFLICT: ', ''),
            )
          if (
            error instanceof Error &&
            /Authentication required|Account is unavailable|Sign in to the original account|Unauthorized|401/.test(
              error.message,
            )
          )
            throw new JournalSyncError('auth-required', error.message)
          if (error instanceof Error && !(error instanceof TypeError))
            throw new JournalSyncError('failed', error.message)
          throw error
        }
      },
    },
  }).catch((error) => {
    opening = undefined
    throw error
  })
  return opening
}
registerOwnerCleanup(async () => {
  const journal = await opening?.catch(() => undefined)
  opening = undefined
  await journal?.close()
})

async function withIdentifiers(
  remote: JournalState,
  owner: string,
  current?: JournalState,
): Promise<JournalState> {
  const missing = journalTableNames.filter(
    (name) =>
      name !== 'settings' &&
      journalTableMetadata[name].primaryKey === 'id' &&
      (current?.identifiers?.[name]?.length ?? 0) < 128,
  )
  const reserved = missing.length
    ? await reserveJournalIdentifiers({
        data: missing,
        headers: { 'X-Roastbook-Owner': owner },
      })
    : {}
  return { ...remote, identifiers: reserved }
}

export async function resetEditionJournal(): Promise<void> {
  throw new Error('Reset is only available in the demo')
}
