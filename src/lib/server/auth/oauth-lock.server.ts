import '@tanstack/react-start/server-only'
import { sql } from 'drizzle-orm'
import { getOAuthLockDb } from '@/db/connection.server'

type Transaction = Parameters<
  Parameters<ReturnType<typeof getOAuthLockDb>['transaction']>[0]
>[0]

export class OAuthClientBusyError extends Error {}

/** Serialize refresh rotation and disconnect across replicas, including reconnects. */
export function withOAuthClientLock<T>(
  clientId: string,
  work: (tx: Transaction) => Promise<T>,
) {
  return getOAuthLockDb().transaction(async (tx) => {
    const [lock] = await tx.execute<{ acquired: boolean }>(
      sql`select pg_try_advisory_xact_lock(hashtextextended(${`oauth:${clientId}`}, 0)) as acquired`,
    )
    // Never occupy the pool with waiters while the provider needs a connection.
    if (!lock?.acquired)
      throw new OAuthClientBusyError('Authorization is busy. Try again.')
    return work(tx)
  })
}
