import '@tanstack/react-start/server-only'
import { eq } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import { authPasskeys, authUsers } from '@/db/schema'
import { DEMO_MODE } from '@/lib/build-mode'

export async function shouldOfferPasskeySetup() {
  if (DEMO_MODE) return false
  const identity = requireIdentity()
  if (!identity.authentication) return false
  const database = getControlDb()
  const [[user], keys] = await Promise.all([
    database
      .select({ dismissedAt: authUsers.passkeyPromptDismissedAt })
      .from(authUsers)
      .where(eq(authUsers.id, identity.id))
      .limit(1),
    database
      .select({ id: authPasskeys.id })
      .from(authPasskeys)
      .where(eq(authPasskeys.userId, identity.id))
      .limit(1),
  ])
  return Boolean(user && !user.dismissedAt && keys.length === 0)
}

export async function loadPasskeySetupOffer() {
  return {
    ownerId: requireIdentity().id,
    offer: await shouldOfferPasskeySetup(),
  }
}

export async function dismissPasskeySetup() {
  const identity = requireIdentity()
  if (!identity.authentication)
    throw new Error('Account management is disabled')
  await getControlDb()
    .update(authUsers)
    .set({ passkeyPromptDismissedAt: new Date(), updatedAt: new Date() })
    .where(eq(authUsers.id, identity.id))
}
