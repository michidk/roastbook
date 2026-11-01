import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { authRateLimits } from '@/db/schema'

/** An atomic address limit supplements IP limits across replicas and proxies. */
export async function allowEmailAttempt(
  email: string,
  action: 'send' | 'verify',
) {
  const windowStart = Math.floor(Date.now() / 600_000) * 600_000
  const key = `email:${action}:${createHash('sha256').update(email).digest('hex')}`
  const [result] = await getControlDb()
    .insert(authRateLimits)
    .values({ id: key, key, count: 1, lastRequest: windowStart })
    .onConflictDoUpdate({
      target: authRateLimits.key,
      set: {
        count: sql`case when ${authRateLimits.lastRequest} < ${windowStart} then 1 else ${authRateLimits.count}+1 end`,
        lastRequest: windowStart,
      },
    })
    .returning({ count: authRateLimits.count })
  return Boolean(result && result.count <= (action === 'send' ? 3 : 8))
}
