import '@tanstack/react-start/server-only'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import { authVerifications } from '@/db/schema'
import {
  type ReauthenticationAction,
  SESSION_ONLY_ACTIONS,
} from '@/modules/auth/reauthentication'

/** The confirming sign-in must have happened this recently. */
const SIGN_IN_WINDOW_MS = 2 * 60_000
/** How long a confirmation waits for its action. */
const CONFIRMATION_LIFETIME_MS = 5 * 60_000

const identifier = (userId: string, action: ReauthenticationAction) =>
  `reauthentication:${userId}:${action}`
const hash = (token: string) => createHash('sha256').update(token).digest('hex')

export class ReauthenticationRequiredError extends Error {
  constructor() {
    super('Confirm it’s you to continue')
    this.name = 'ReauthenticationRequiredError'
  }
}

/**
 * Issues a single-use confirmation for one action. The caller has just signed
 * in again in the confirmation dialog, so the session is seconds old; an older
 * session, such as a stolen cookie, cannot obtain one.
 */
export async function issueReauthentication(
  action: ReauthenticationAction,
  expectedUserId: string,
) {
  const identity = requireIdentity()
  if (!identity.authentication)
    throw new Error('This instance has no accounts to confirm')
  if (SESSION_ONLY_ACTIONS.has(action))
    throw new Error('This action needs no confirmation token')
  if (identity.id !== expectedUserId)
    throw new Error('Confirm with the account you are using')
  if (
    !identity.authenticatedAt ||
    Date.now() - identity.authenticatedAt.getTime() > SIGN_IN_WINDOW_MS
  )
    throw new ReauthenticationRequiredError()
  const token = randomBytes(32).toString('base64url')
  await getControlDb()
    .insert(authVerifications)
    .values({
      id: randomUUID(),
      identifier: identifier(identity.id, action),
      value: hash(token),
      expiresAt: new Date(Date.now() + CONFIRMATION_LIFETIME_MS),
    })
  return token
}

/**
 * Uses up the confirmation for this action. Without built-in accounts there is
 * nobody to confirm, so the action proceeds as before.
 */
export async function consumeReauthentication(
  action: ReauthenticationAction,
  token: string | undefined,
) {
  const identity = requireIdentity()
  if (!identity.authentication) return
  if (!token) throw new ReauthenticationRequiredError()
  const [used] = await getControlDb()
    .delete(authVerifications)
    .where(
      and(
        eq(authVerifications.identifier, identifier(identity.id, action)),
        eq(authVerifications.value, hash(token)),
        gt(authVerifications.expiresAt, new Date()),
      ),
    )
    .returning({ id: authVerifications.id })
  if (!used) throw new ReauthenticationRequiredError()
}
