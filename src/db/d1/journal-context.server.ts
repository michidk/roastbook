import '@tanstack/react-start/server-only'
import { AsyncLocalStorage } from 'node:async_hooks'
import { eq } from 'drizzle-orm'
import { getJournalDb } from './connection.server'
import { authUsers } from './schema'

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
  database: ReturnType<typeof getJournalDb>
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

/** D1 scope carries ownership. Atomic writes use explicit D1 batches. */
export async function withJournal<T>(
  identity: JournalIdentity,
  work: () => Promise<T>,
  options: { allowDeleting?: boolean; signal?: AbortSignal } = {},
): Promise<T> {
  if (context.getStore()) throw new Error('Journal scopes cannot be nested')
  if (!identity.authentication)
    throw new Error('Hosted journals require authentication')
  options.signal?.throwIfAborted()
  const database = getJournalDb()
  const [user] = await database
    .select({ deletingAt: authUsers.deletingAt })
    .from(authUsers)
    .where(eq(authUsers.id, identity.id))
  if (!user || (user.deletingAt && !options.allowDeleting))
    throw new Error('Account is unavailable')
  return context.run(
    { identity, database, signal: options.signal },
    async () => {
      options.signal?.throwIfAborted()
      const result = await work()
      options.signal?.throwIfAborted()
      return result
    },
  )
}
