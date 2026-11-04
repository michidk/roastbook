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
  journalRevision,
  loadJournalSnapshot,
  prepareJournalWrite,
} from './journal-snapshot.server'

/** Returns null when the journal is still at revision `since`. */
export const getJournalSnapshot = createServerFn({ method: 'GET' })
  .validator(z.object({ since: z.number().int().nonnegative().nullable() }))
  .handler(async ({ data }) =>
    data.since !== null && (await journalRevision()) === data.since
      ? null
      : loadJournalSnapshot(),
  )

/** Returns the journal only when another device changed it since `revision`. */
export const sendJournalCommand = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      command: journalCommandSchema,
      revision: z.number().int().nonnegative(),
    }),
  )
  .handler(async ({ data }) => {
    const state = await applyJournalCommand(data.command, data.revision)
    // A write moves the revision by exactly one; anything else came from elsewhere.
    return {
      serverRevision: state.serverRevision,
      state: state.serverRevision === data.revision + 1 ? null : state,
    }
  })

export const reserveJournalIdentifiers = createServerFn({ method: 'POST' })
  .validator(z.array(z.enum(journalTableNames)).max(40))
  .handler(async ({ data }) => {
    await prepareJournalWrite()
    const result: Record<string, number[]> = {}
    for (const name of new Set(data)) {
      if (journalTableMetadata[name].primaryKey === 'id' && name !== 'settings')
        result[name] = await allocateJournalIds(tables[name], 256)
    }
    return result
  })
