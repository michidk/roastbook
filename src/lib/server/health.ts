import { createServerOnlyFn } from '@tanstack/react-start'
import { sql } from 'drizzle-orm'
import { DEMO_MODE } from '@/lib/build-mode'

export const probeDatabase = createServerOnlyFn(async () => {
  if (DEMO_MODE) {
    return
  } else {
    const { getControlDb } = await import('@/db/connection.server')
    await getControlDb().execute(sql`select 1`)
  }
})
