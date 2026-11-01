import { createServerOnlyFn } from '@tanstack/react-start'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import type * as schema from './schema'

type Database = PgliteDatabase<typeof schema>

let instance: Database | undefined

if (import.meta.env.SSR) {
  const [{ readFile }, { PGlite }, { drizzle }, schema] = await Promise.all([
    import('node:fs/promises'),
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
    import('./schema'),
  ])
  const snapshot = await readFile(
    new URL(/* @vite-ignore */ '../_libs/demo-db.tar.gz', import.meta.url),
  )
  const client = await PGlite.create({
    dataDir: 'memory://',
    loadDataDir: new Blob([snapshot]),
  })
  instance = drizzle(client, { schema })
}

export const getDb = createServerOnlyFn((): Database => {
  if (!instance)
    throw new Error('Demo database is only available on the server')
  return instance
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
