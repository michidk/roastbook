import { createIsomorphicFn } from '@tanstack/react-start'
import { z } from 'zod'
import { readLocalJournal, writeLocalJournal } from './local-journal'

/** Compatibility with existing route contracts while local results use shared validated models. */
export function journalFunction<A extends unknown[], R>(
  remote: (...args: A) => Promise<R>,
  operation: string,
  write: boolean,
) {
  const local = async (...args: A): Promise<R> => {
    const input =
      args[0] === undefined
        ? undefined
        : z
            .object({ data: z.unknown().optional() })
            .passthrough()
            .parse(args[0]).data
    const result = await (write
      ? writeLocalJournal(operation, input)
      : readLocalJournal(operation, input))
    return result as R
  }
  return createIsomorphicFn().server(remote).client(local)
}
