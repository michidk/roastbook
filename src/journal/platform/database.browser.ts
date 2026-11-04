// Browser platform: the local PGlite journal of the current owner.
import {
  and,
  type Column,
  eq,
  getTableName,
  type SQL,
  sql,
  type Table,
} from 'drizzle-orm'
import { currentScope, type LocalDatabase } from '@/journal/local/client'
import { toDisplayableError } from '@/lib/error-display'
import {
  applyJournalMutations,
  type JournalMutation,
  journalIdAllocationQuery,
  parseJournalIds,
} from '@/lib/journal-mutations'

export type { JournalMutation }

function scope() {
  const current = currentScope()
  if (!current) throw new Error('Journal access requires a local journal scope')
  return current
}

export const db = new Proxy({} as LocalDatabase, {
  get: (_target, property) => {
    const transaction = scope().tx
    const value = Reflect.get(transaction, property)
    return typeof value === 'function' ? value.bind(transaction) : value
  },
})

export async function runJournalMutations(
  mutations: readonly JournalMutation[],
): Promise<void> {
  if (!mutations.length) return
  await scope().tx.transaction((transaction) =>
    applyJournalMutations(
      mutations,
      async (statement) => (await transaction.execute(statement)).affectedRows,
    ),
  )
}

/**
 * Synced journals take identifiers from the pool the server reserved for this
 * device, so offline records keep their identity on the server. Each choice is
 * recorded for the replay.
 */
export async function allocateJournalIds(table: Table, count = 1) {
  const current = scope()
  const kind = `id:${getTableName(table)}`
  if (current.replaying) {
    const queue = current.recorded[kind] ?? []
    if (queue.length < count)
      throw new Error('The saved change no longer matches its identifiers')
    return queue.splice(0, count) as number[]
  }
  const pooled = await current.tx.execute<{ id: string }>(
    !current.sync
      ? journalIdAllocationQuery(table, count)
      : sql`delete from roastbook_local.id_pool where (table_name, id) in (select table_name, id from roastbook_local.id_pool where table_name = ${getTableName(table)} order by id limit ${count}) returning id::text as id`,
  )
  const ids = parseJournalIds(pooled.rows)
  if (ids.length < count)
    throw new Error(
      'Connect to Roastbook to reserve more record identifiers, then try again. Your saved journal has not changed.',
    )
  current.recorded[kind] = [...(current.recorded[kind] ?? []), ...ids]
  return ids
}

export function journalOwnerId(): string {
  return scope().identity.id
}

export function journalIdentity() {
  return currentScope()?.identity
}

export function owned(
  table: { ownerId: Column },
  ...conditions: Array<SQL | undefined>
): SQL {
  const owner = eq(table.ownerId, journalOwnerId())
  return and(owner, ...conditions) ?? owner
}

export function journalInsertValues<T extends object>(
  values: T[],
): Array<Omit<T, 'ownerId'> & { ownerId: string }>
export function journalInsertValues<T extends object>(
  values: T,
): Omit<T, 'ownerId'> & { ownerId: string }
export function journalInsertValues<T extends object>(values: T | T[]) {
  const ownerId = journalOwnerId()
  return Array.isArray(values)
    ? values.map((value) => ({ ...value, ownerId }))
    : { ...values, ownerId }
}

export async function toDisplayableDatabaseError(error: unknown) {
  return toDisplayableError(error)
}
