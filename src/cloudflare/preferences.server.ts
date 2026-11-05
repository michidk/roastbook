import '@tanstack/react-start/server-only'
import { eq } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import { authUsers } from '@/db/schema'

function accountId() {
  const identity = requireIdentity()
  if (!identity.authentication) throw new Error('Sign in to change preferences')
  return identity.id
}

export async function loadAccountPreferences() {
  const [user] = await getControlDb()
    .select({
      newsletter: authUsers.newsletterOptIn,
      termsVersion: authUsers.termsVersion,
      termsAcceptedAt: authUsers.termsAcceptedAt,
    })
    .from(authUsers)
    .where(eq(authUsers.id, accountId()))
  if (!user) throw new Error('Account is unavailable')
  return user
}

export async function saveNewsletterOptIn(optIn: boolean) {
  await getControlDb()
    .update(authUsers)
    .set({ newsletterOptIn: optIn })
    .where(eq(authUsers.id, accountId()))
}
