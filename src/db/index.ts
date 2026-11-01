import { createServerOnlyFn } from '@tanstack/react-start'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { getServerEnv } from '@/lib/env.server'
import { getControlDb } from './connection.server'
import { getJournalContext } from './journal-context.server'
import type * as schema from './schema'

type Database = PostgresJsDatabase<typeof schema>

export const getDb = createServerOnlyFn(() => {
  const scope = getJournalContext()
  if (scope) return scope.database
  if (getServerEnv().AUTH_ENABLED)
    throw new Error('Database access requires a journal scope')
  return getControlDb()
})

// Drizzle transactions implement the same query interface; transaction() creates a savepoint.
export const db = new Proxy({} as Database, {
  get: (_target, property) => {
    const database = getDb()
    const value = Reflect.get(database, property)
    return typeof value === 'function' ? value.bind(database) : value
  },
})
