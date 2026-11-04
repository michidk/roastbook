import { createServerOnlyFn } from '@tanstack/react-start'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@/db/schema'

type Database = PostgresJsDatabase<typeof schema>

export const getDb = createServerOnlyFn((): Database => {
  throw new Error('The demo journal is available only in the visitor’s browser')
})

/**
 * Mirrors the `db` export of `@/db`, which `vite.config.ts` aliases to this
 * module for demo builds. Knip cannot follow that build-conditional alias.
 *
 * @public
 */
export const db = new Proxy({} as Database, {
  get: (_target, property) => Reflect.get(getDb(), property),
})
