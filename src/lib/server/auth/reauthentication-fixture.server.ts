import '@tanstack/react-start/server-only'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { issueReauthentication } from '@/lib/server/auth/reauthentication.server'
import type { ReauthenticationAction } from '@/modules/auth/reauthentication'

/** Tests: the confirmation an owner gets right after signing in again. */
export function confirmAs(
  identity: JournalIdentity,
  action: ReauthenticationAction,
) {
  return withJournal({ ...identity, authenticatedAt: new Date() }, () =>
    issueReauthentication(action, identity.id),
  )
}
