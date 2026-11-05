import { createServerOnlyFn } from '@tanstack/react-start'
import type { getControlDb } from './connection.server'
import { getJournalContext } from './journal-context.server'

type Database = ReturnType<typeof getControlDb>
export const getDb = createServerOnlyFn((): Database => {
  const scope = getJournalContext()
  if (!scope) throw new Error('Database access requires a journal scope')
  scope.signal?.throwIfAborted()
  return scope.database
})
// The proxy resolves a real D1 database on every access. It does not implement
// transactions or provide a PostgreSQL-compatible facade.
export const db = new Proxy({} as Database, {
  get: (_target, property) => {
    const database = getDb()
    const value = Reflect.get(database, property)
    return typeof value === 'function' ? value.bind(database) : value
  },
})
