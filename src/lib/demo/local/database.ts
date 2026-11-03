import type { PGlite } from '@electric-sql/pglite'
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite'
import type * as Schema from '@/db/schema'

type Database = PgliteDatabase<typeof Schema>
let database: Database | undefined

export function setDemoDatabase(client: PGlite, schema: typeof Schema) {
  database = drizzle(client, { schema })
}

export function getDb(): Database {
  if (!database) throw new Error('The browser journal is not initialized')
  return database
}

export const db = new Proxy({} as Database, {
  get: (_target, property) => Reflect.get(getDb(), property),
})
