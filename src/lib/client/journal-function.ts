import { createIsomorphicFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { JournalCommandOperation } from '@/modules/journal/commands'
import type { JournalReadOperation } from '@/modules/journal/reads'
import { readLocalJournal, writeLocalJournal } from './local-journal'

export function journalRead<A extends unknown[], R>(
  remote: (...args: A) => Promise<R>,
  operation: JournalReadOperation | 'app-settings/getAppSettings',
) {
  return journalFunction(remote, (input) => readLocalJournal(operation, input))
}

export function journalWrite<A extends unknown[], R>(
  remote: (...args: A) => Promise<R>,
  operation: JournalCommandOperation,
) {
  return journalFunction(remote, (input) => writeLocalJournal(operation, input))
}

/** Compatibility with existing route contracts while local results use shared validated models. */
function journalFunction<A extends unknown[], R>(
  remote: (...args: A) => Promise<R>,
  run: (input: unknown) => Promise<unknown>,
) {
  const local = async (...args: A): Promise<R> => {
    const input =
      args[0] === undefined
        ? undefined
        : z
            .object({ data: z.unknown().optional() })
            .passthrough()
            .parse(args[0]).data
    const result = await run(input)
    return result as R
  }
  return createIsomorphicFn().server(remote).client(local)
}
