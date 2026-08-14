import { createServerOnlyFn } from '@tanstack/react-start'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type postgres from 'postgres'
import { getServerEnv } from '@/lib/env.server'
import * as schema from './schema'

type Database = PostgresJsDatabase<typeof schema>
type DrizzleFactory = typeof import('drizzle-orm/postgres-js').drizzle
type PostgresFactory = typeof postgres

let drizzleFactory: DrizzleFactory | undefined
let postgresFactory: PostgresFactory | undefined
let instance: Database | undefined

if (import.meta.env.SSR) {
  const [{ drizzle }, { default: postgres }] = await Promise.all([
    import('drizzle-orm/postgres-js'),
    import('postgres'),
  ])
  drizzleFactory = drizzle
  postgresFactory = postgres
}

export const getDb = createServerOnlyFn((): Database => {
  if (instance) return instance
  if (!drizzleFactory || !postgresFactory) {
    throw new Error('Database access is only available on the server')
  }

  const { DATABASE_URL: connectionString } = getServerEnv()

  instance = drizzleFactory(postgresFactory(connectionString), { schema })
  return instance
})

export const db = new Proxy({} as Database, {
  get: (_target, property) => Reflect.get(getDb(), property),
})
