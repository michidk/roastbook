import type { JournalState } from '@roastbook/journal-domain/state'
import { createCollection, createLiveQueryCollection } from '@tanstack/db'
import type { ClientJournal } from './journal'

/** One source event per committed journal, so related records never publish separately. */
export function journalCollection(journal: ClientJournal) {
  return createCollection({
    getKey: (_state: JournalState) => 'journal',
    gcTime: Infinity,
    sync: {
      sync({ begin, write, commit, markReady }) {
        let initialized = false
        return journal.subscribe((state) => {
          begin()
          write({ type: initialized ? 'update' : 'insert', value: state })
          commit()
          initialized = true
          markReady()
        })
      },
    },
  })
}

/** The same pure read operation drives demo, browser product and installed PWA. */
export function journalQuery(
  collection: ReturnType<typeof journalCollection>,
  read: (state: JournalState) => unknown,
) {
  return createLiveQueryCollection({
    gcTime: 1,
    query: (q) =>
      q
        .from({ journal: collection })
        .fn.select(({ journal }) => ({ value: read(journal) })),
  })
}

/** Wait until reads include a revision already confirmed by durable storage. */
export async function awaitJournalRevision(
  collection: ReturnType<typeof journalCollection>,
  revision: number,
): Promise<void> {
  await collection.preload()
  if ((collection.get('journal')?.revision ?? -1) >= revision) return
  await new Promise<void>((resolve, reject) => {
    const subscription = collection.subscribeChanges(() => {
      if ((collection.get('journal')?.revision ?? -1) >= revision) {
        clearTimeout(timeout)
        subscription.unsubscribe()
        resolve()
      }
    })
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      reject(
        new Error(
          'The local journal query could not refresh. Reload to read your saved changes.',
        ),
      )
    }, 10000)
  })
}
