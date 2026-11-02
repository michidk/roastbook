import '@tanstack/react-start/server-only'
import { AsyncLocalStorage } from 'node:async_hooks'
import { setTimeout as delay } from 'node:timers/promises'
import { eq, sql } from 'drizzle-orm'
import { getJournalDb } from './connection.server'
import { JournalAdmission, JournalBusyError } from './journal-admission.server'
import { authUsers } from './schema'

type Transaction = Parameters<
  Parameters<ReturnType<typeof getJournalDb>['transaction']>[0]
>[0]
export type JournalIdentity = {
  id: string
  email: string
  role: 'user' | 'admin'
  authentication: boolean
  authenticatedAt: Date | null
  mcpScopes?: readonly string[]
}
const context = new AsyncLocalStorage<{
  identity: JournalIdentity
  database: Transaction
  signal?: AbortSignal
}>()

export function getJournalContext() {
  return context.getStore()
}

export function requireIdentity() {
  const scope = context.getStore()
  if (!scope) throw new Error('A journal identity is required')
  scope.signal?.throwIfAborted()
  return scope.identity
}

const admission = new JournalAdmission()

export async function withJournal<T>(
  identity: JournalIdentity,
  work: () => Promise<T>,
  options: { allowDeleting?: boolean; signal?: AbortSignal } = {},
): Promise<T> {
  if (context.getStore()) throw new Error('Journal scopes cannot be nested')
  const lockDeadline = Date.now() + 5_000
  const release = await admission.acquire(identity.id, options.signal)
  try {
    while (true) {
      try {
        return await getJournalDb().transaction(async (database) => {
          options.signal?.throwIfAborted()
          const [lock] = await database.execute<{ acquired: boolean }>(
            sql`select pg_try_advisory_xact_lock(hashtextextended(${identity.id}, 0)) as acquired`,
          )
          if (!lock?.acquired) throw new JournalBusyError()
          const [currentUser] = await database
            .select({ deletingAt: authUsers.deletingAt })
            .from(authUsers)
            .where(eq(authUsers.id, identity.id))
          if (
            !currentUser ||
            (currentUser.deletingAt && !options.allowDeleting)
          )
            throw new Error('Account is unavailable')
          await database.execute(
            sql`select set_config('roastbook.user_id', ${identity.id}, true)`,
          )
          await database.execute(sql`set local role roastbook_journal`)
          return context.run(
            { identity, database, signal: options.signal },
            () => runJournalWork(work, options.signal),
          )
        })
      } catch (error) {
        if (!(error instanceof JournalBusyError) || Date.now() >= lockDeadline)
          throw error
        // Another replica owns the lock. Retry after releasing this connection.
        await delay(
          Math.min(100, Math.max(1, lockDeadline - Date.now())),
          undefined,
          { signal: options.signal },
        )
      }
    }
  } finally {
    release()
  }
}

function runJournalWork<T>(
  work: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return work()
  signal.throwIfAborted()
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
    void Promise.resolve()
      .then(() => {
        signal.throwIfAborted()
        return work()
      })
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', onAbort))
  })
}
