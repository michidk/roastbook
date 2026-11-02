import '@tanstack/react-start/server-only'
import { and, type Column, eq, type SQL } from 'drizzle-orm'
import { getJournalContext } from '@/db/journal-context.server'
import { DEMO_MODE } from '@/lib/build-mode'
import { getServerEnv } from '@/lib/env.server'

export function journalOwnerId(): string {
  const context = getJournalContext()
  if (context) {
    context.signal?.throwIfAborted()
    return context.identity.id
  }
  if (DEMO_MODE || !getServerEnv().AUTH_ENABLED) return 'local'
  throw new Error('A journal identity is required')
}

export function owned(
  table: { ownerId: Column },
  ...conditions: Array<SQL | undefined>
): SQL {
  const owner = eq(table.ownerId, journalOwnerId())
  return and(owner, ...conditions) ?? owner
}

export function journalValues<T extends object>(
  value: T,
): Omit<T, 'ownerId'> & { ownerId: string } {
  return { ...value, ownerId: journalOwnerId() }
}

export function journalRows<T extends object>(
  values: readonly T[],
): Array<Omit<T, 'ownerId'> & { ownerId: string }> {
  return values.map(journalValues)
}

export function journalInsertValues<T extends object>(
  values: T[],
): Array<Omit<T, 'ownerId'> & { ownerId: string }>
export function journalInsertValues<T extends object>(
  values: T,
): Omit<T, 'ownerId'> & { ownerId: string }
export function journalInsertValues<T extends object>(values: T | T[]) {
  return Array.isArray(values) ? journalRows(values) : journalValues(values)
}
