// Demo edition: a fictional journal kept only in this browser, never synced.

import {
  type LocalJournal,
  notifyLocalChange,
  openLocalJournal,
} from '@/journal/local/client'
import { forgetLocalMedia } from '@/journal/local/media'
import { replaceJournalRows } from '@/journal/local/snapshot'

async function loadSample(journal: LocalJournal) {
  const response = await fetch('/demo-local/journal.json').catch(() => null)
  if (!response?.ok)
    throw new Error(
      'The sample journal could not load. Reload to retry. Your saved demo has not been changed.',
    )
  const sample = (await response.json()) as {
    tables: Record<string, object[]>
  }
  await replaceJournalRows(journal, sample.tables)
}

export function openEditionJournal() {
  return openLocalJournal(() => ({
    database: 'roastbook-demo',
    sync: false,
    identity: () => ({
      id: 'local',
      email: '',
      role: 'user',
      authentication: false,
    }),
    bootstrap: loadSample,
  }))
}

export async function synchronizeEditionJournal() {}

/** Restores the sample journal and removes pictures added in this browser. */
export async function resetDemoJournal() {
  const journal = await openEditionJournal()
  await journal.client.query(
    'truncate roastbook_local.outbox, roastbook_local.media',
  )
  forgetLocalMedia()
  await loadSample(journal)
  void notifyLocalChange('download')
}
