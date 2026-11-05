import '@tanstack/react-start/server-only'
import { randomUUID } from 'node:crypto'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { issueReauthentication } from '@/lib/server/auth/reauthentication.server'
import type { ReauthenticationAction } from '@/modules/auth/reauthentication'

/** Tests: the confirmation an owner gets right after signing in again. */
export async function confirmAs(
  identity: JournalIdentity,
  action: ReauthenticationAction,
) {
  // Each confirmation needs its own fresh sign-in session.
  const fresh = {
    ...identity,
    authenticatedAt: new Date(),
    sessionId: randomUUID(),
  }
  const token = await withJournal(fresh, () =>
    issueReauthentication(action, identity.id),
  )
  if (!token) throw new Error(`${action} needs no confirmation token`)
  return token
}
