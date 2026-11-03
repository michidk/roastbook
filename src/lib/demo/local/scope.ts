import { and, type Column, eq, type SQL } from 'drizzle-orm'

export function journalOwnerId() {
  return 'local'
}

export function owned(
  table: { ownerId: Column },
  ...conditions: (SQL | undefined)[]
) {
  const owner = eq(table.ownerId, journalOwnerId())
  return and(owner, ...conditions) ?? owner
}

export function journalInsertValues<T extends object>(
  values: T[],
): Array<T & { ownerId: string }>
export function journalInsertValues<T extends object>(
  values: T,
): T & { ownerId: string }
export function journalInsertValues<T extends object>(values: T | T[]) {
  return Array.isArray(values)
    ? values.map((value) => ({ ...value, ownerId: journalOwnerId() }))
    : { ...values, ownerId: journalOwnerId() }
}

export const journalValues = <T extends object>(value: T) => ({
  ...value,
  ownerId: journalOwnerId(),
})
export const journalRows = <T extends object>(values: readonly T[]) =>
  values.map(journalValues)

export function getJournalContext() {
  return undefined
}
