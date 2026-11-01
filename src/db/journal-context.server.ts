import '@tanstack/react-start/server-only'
import { AsyncLocalStorage } from 'node:async_hooks'
import { eq, sql } from 'drizzle-orm'
import { getControlDb } from './connection.server'
import { authUsers } from './schema'

type Transaction = Parameters<
  Parameters<ReturnType<typeof getControlDb>['transaction']>[0]
>[0]
export type JournalIdentity = {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  authentication: boolean
  authenticatedAt: Date | null
}
const context = new AsyncLocalStorage<{
  identity: JournalIdentity
  database: Transaction
}>()

export function getJournalContext() {
  return context.getStore()
}

export function requireIdentity() {
  const scope = context.getStore()
  if (!scope) throw new Error('A journal identity is required')
  return scope.identity
}

export async function withJournal<T>(
  identity: JournalIdentity,
  work: () => Promise<T>,
  options: { allowDeleting?: boolean } = {},
): Promise<T> {
  if (context.getStore()) throw new Error('Journal scopes cannot be nested')
  return getControlDb().transaction(async (database) => {
    await database.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${identity.id}, 0))`,
    )
    const [currentUser] = await database
      .select({ deletingAt: authUsers.deletingAt })
      .from(authUsers)
      .where(eq(authUsers.id, identity.id))
    if (!currentUser || (currentUser.deletingAt && !options.allowDeleting))
      throw new Error('Account is unavailable')
    await database.execute(
      sql`select set_config('roastbook.user_id', ${identity.id}, true)`,
    )
    await database.execute(sql`set local role roastbook_journal`)
    return context.run({ identity, database }, work)
  })
}
