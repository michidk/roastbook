import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  journalWriteName,
  loadJournalRows,
  replayJournalWrite,
  reserveJournalIdentifiers,
} from './journal-sync.server'

/** The owner's journal rows, unless the browser already has this revision. */
export const pullJournal = createServerFn({ method: 'GET' })
  .validator(z.object({ since: z.number().int().nonnegative().nullable() }))
  .handler(({ data }) => loadJournalRows(data.since))

/** Replays one write a browser recorded, once. */
export const pushJournalWrite = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().regex(journalWriteName),
      input: z.unknown(),
      recorded: z.record(z.string(), z.array(z.unknown()).max(500)),
      key: z.uuid(),
      revision: z.number().int().nonnegative(),
    }),
  )
  .handler(({ data }) => replayJournalWrite(data))

/** Identifiers this device may assign to records it creates offline. */
export const reserveJournalIds = createServerFn({ method: 'POST' })
  .validator(z.array(z.string()).max(60))
  .handler(({ data }) => reserveJournalIdentifiers(data))
