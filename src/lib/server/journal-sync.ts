import {
  journalTableMetadata,
  journalTableNames,
} from '@roastbook/journal-domain/model'
import { journalCommandSchema } from '@roastbook/journal-domain/state'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { allocateJournalIds } from '@/db/journal-mutations.server'
import * as tables from '@/db/schema'
import {
  applyJournalCommand,
  loadJournalSnapshot,
} from './journal-snapshot.server'
import { drainMediaCleanupQueue } from './media-lifecycle.server'

export const getJournalSnapshot = createServerFn({ method: 'GET' }).handler(
  async () => {
    await drainMediaCleanupQueue()
    return loadJournalSnapshot()
  },
)
export const sendJournalCommand = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      command: journalCommandSchema,
      revision: z.number().int().nonnegative(),
    }),
  )
  .handler(({ data }) => applyJournalCommand(data.command, data.revision))

export const reserveJournalIdentifiers = createServerFn({ method: 'POST' })
  .validator(z.array(z.enum(journalTableNames)).max(40))
  .handler(async ({ data }) => {
    const result: Record<string, number[]> = {}
    for (const name of new Set(data)) {
      if (journalTableMetadata[name].primaryKey === 'id' && name !== 'settings')
        result[name] = await allocateJournalIds(tables[name], 256)
    }
    return result
  })
