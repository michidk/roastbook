import type { JournalRow, JournalTable } from '@roastbook/journal-domain/model'
import {
  type JournalCommand,
  type JournalState,
  JournalTransaction,
} from '@roastbook/journal-domain/state'
import { z } from 'zod'
import { getSmallThumbnailPath, getThumbnailPath } from '@/lib/image-path'
import { journalDates, storedValues } from './serialization'

export type CommandContext = {
  tx: JournalTransaction
  now: string
  id: string
  mediaNamespace: string
  media: JournalState['media']
  policy: JournalState['policy']
}
export function defineCommand<S extends z.ZodType, R>(
  schema: S,
  run: (context: CommandContext, data: z.output<S>) => R,
) {
  return {
    run: (context: CommandContext, input: unknown) =>
      run(context, schema.parse(input)),
  }
}

export function replaceLinks<T extends JournalTable>(
  tx: JournalTransaction,
  table: T,
  foreignKey: keyof JournalRow<T>,
  id: number,
  values: readonly Partial<JournalRow<T>>[],
) {
  const existing = tx.rows(table).filter((row) => row[foreignKey] === id)
  const keep = new Set<number>()
  for (const value of values) {
    const match = existing.find((row) =>
      Object.entries(value).every(
        ([key, entry]) => Reflect.get(row, key) === entry,
      ),
    )
    if (match) keep.add(tx.key(table, match))
    else {
      const inserted = tx.insert(table, value)
      keep.add(tx.key(table, inserted))
    }
  }
  tx.deleteWhere(
    table,
    (row) => row[foreignKey] === id && !keep.has(tx.key(table, row)),
  )
}

export function executeJournalCommand(
  state: JournalState,
  command: JournalCommand,
  commands: Record<
    string,
    { run: (context: CommandContext, input: unknown) => unknown }
  >,
) {
  const operation = Object.hasOwn(commands, command.operation)
    ? commands[command.operation]
    : undefined
  if (!operation)
    throw new Error('This operation is unavailable in the local journal')
  const offsets = new Map<JournalTable, number>()
  const identifiers = structuredClone(state.identifiers)
  const tx = new JournalTransaction(state.tables, {
    now: command.createdAt,
    uuid: () => command.id,
    allocate: (table) => {
      const offset = offsets.get(table) ?? 0
      offsets.set(table, offset + 1)
      const allocations = command.allocations[table] ?? []
      command.allocations[table] = allocations
      // Allocation is recorded in the same atomic document as the command. Retry
      // and server replay reuse the identifiers chosen before the local commit.
      const reserved =
        allocations[offset] === undefined
          ? identifiers?.[table]?.shift()
          : undefined
      const allocated =
        allocations[offset] ??
        reserved ??
        (identifiers === null
          ? Math.max(0, ...tx.rows(table).map((row) => tx.key(table, row))) + 1
          : undefined)
      if (allocated === undefined)
        throw new Error(
          'Connect to Roastbook to reserve more record identifiers, then try again. Your saved data has not changed.',
        )
      allocations[offset] = allocated
      // RxDB may retry this callback after another tab commits. Remove recorded
      // allocations from the latest pool too, so no identifier is used twice.
      if (identifiers?.[table])
        identifiers[table] = identifiers[table].filter((id) => id !== allocated)
      return allocated
    },
  })
  const media = structuredClone(state.media)
  const result = operation.run(
    {
      tx,
      now: command.createdAt,
      id: command.id,
      mediaNamespace: state.mediaNamespace,
      media,
      policy: state.policy,
    },
    journalDates(command.data),
  )
  const tables = tx.finish()
  const paths = new Set(
    [
      'beanImages',
      'gearImages',
      'coffeeShopImages',
      'shotImages',
      'cafeVisitImages',
    ].flatMap((table) =>
      z
        .array(z.object({ storagePath: z.string() }))
        .parse(Reflect.get(tables, table))
        .flatMap((row) => [
          row.storagePath,
          getThumbnailPath(row.storagePath),
          getSmallThumbnailPath(row.storagePath),
        ]),
    ),
  )
  for (const path of Object.keys(media))
    if (!paths.has(path)) delete media[path]
  return {
    state: { ...state, tables, media, identifiers },
    result: storedValues(result),
  }
}
