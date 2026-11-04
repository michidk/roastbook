// Product edition: the owner's journal is kept in this browser and synced.
// The demo build replaces this module with its fixture-seeded, unsynced edition.
import type { JournalConfig } from '@/journal/platform/config'
import { setJournalConfig } from '@/journal/platform/config.browser'
import { getOfflineOwner } from '@/lib/journal-owner'
import {
  type LocalIdentity,
  type LocalJournal,
  localDatabaseName,
  openLocalJournal,
  subscribeLocalChanges,
} from './client'
import { migrateLegacyOffline } from './legacy-offline'
import {
  downloadJournal,
  loadAccount,
  refreshSyncStatus,
  synchronizeJournal,
} from './sync'

let account: Awaited<ReturnType<typeof loadAccount>> = null

function identity(owner: string): LocalIdentity {
  return {
    id: owner,
    email: account?.email ?? '',
    role: account?.role ?? 'user',
    authentication: Boolean(account),
  }
}

let syncScheduled: ReturnType<typeof setTimeout> | undefined
let setup: { journal: LocalJournal; ready: Promise<void> } | undefined

/** Prepares an opened journal once; every caller waits for the same setup. */
async function prepare(journal: LocalJournal) {
  // Every local write is followed by a sync once the burst of edits settles.
  subscribeLocalChanges((change) => {
    if (change === 'download') return
    void refreshSyncStatus(journal).catch(() => undefined)
    clearTimeout(syncScheduled)
    syncScheduled = setTimeout(() => void synchronizeJournal(journal), 800)
  })
  account = await loadAccount(journal)
  const config = await journal.getState<JournalConfig>('config')
  if (config) setJournalConfig(config)
  await refreshSyncStatus(journal)
  // Until every earlier change moved, each start retries the rest. It holds
  // the sync lock, so moved changes stay in the outbox until it finishes.
  const moveLegacy = async () => {
    if (await journal.getState('legacyMoved')) return
    const failed = await migrateLegacyOffline(journal).catch(() => -1)
    await journal.setState('legacyFailed', failed)
    if (!failed) await journal.setState('legacyMoved', true)
  }
  // Checked first, so later opens never wait for a running sync.
  if (await journal.getState('legacyMoved')) return
  await (navigator.locks
    ? navigator.locks.request(
        `roastbook-sync-${journal.options.database}`,
        moveLegacy,
      )
    : moveLegacy())
}

export async function openEditionJournal() {
  const journal = await openLocalJournal((owner) => ({
    database: localDatabaseName('journal', owner),
    sync: true,
    identity: () => identity(owner),
    bootstrap: async (opened) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine)
        throw new Error(
          'Connect to the internet once to download your journal. After that it works offline.',
        )
      await downloadJournal(opened)
    },
  }))
  if (setup?.journal !== journal) setup = { journal, ready: prepare(journal) }
  await setup.ready
  return journal
}

/** Starts a sync now, for app start, reconnecting and manual retries. */
export async function synchronizeEditionJournal() {
  if (getOfflineOwner() === undefined) return
  const journal = await openEditionJournal()
  await synchronizeJournal(journal)
  account = await loadAccount(journal)
}
