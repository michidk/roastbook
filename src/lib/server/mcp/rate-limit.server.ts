import '@tanstack/react-start/server-only'
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import { authRateLimits } from '@/db/schema'

export async function allowMcpRequest() {
  const key = `mcp:${requireIdentity().id}`
  const windowStart = Math.floor(Date.now() / 60_000) * 60_000
  const [row] = await getControlDb()
    .insert(authRateLimits)
    .values({ id: randomUUID(), key, count: 1, lastRequest: windowStart })
    .onConflictDoUpdate({
      target: authRateLimits.key,
      set: {
        count: sql`case when ${authRateLimits.lastRequest} < ${windowStart} then 1 else ${authRateLimits.count}+1 end`,
        lastRequest: windowStart,
      },
    })
    .returning({ count: authRateLimits.count })
  return !!row && row.count <= 120
}
