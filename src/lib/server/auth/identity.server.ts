import '@tanstack/react-start/server-only'
import { and, eq, isNull, ne, sql } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import type { JournalIdentity } from '@/db/journal-context.server'
import { aiProviderCredentials, authUsers, instanceIdentity } from '@/db/schema'
import { getServerEnv } from '@/lib/env.server'
import { decryptAiKey, encryptAiKey } from '../ai-credential.server'
import { createJournalDefaults } from './defaults.server'
import { journalTables } from './journal-tables.server'

export async function initializeUser(user: {
  id: string
  email: string
  emailVerified: boolean
}) {
  if (!user.emailVerified) throw new Error('Email verification is required')
  const [initialized] = await getControlDb()
    .select({ at: authUsers.journalInitializedAt })
    .from(authUsers)
    .where(eq(authUsers.id, user.id))
  if (initialized?.at) return
  const env = getServerEnv()
  await getControlDb().transaction(async (tx) => {
    const [instance] = await tx
      .select()
      .from(instanceIdentity)
      .where(eq(instanceIdentity.id, 1))
      .for('update')
    if (!instance)
      throw new Error('Run database migrations before enabling authentication')
    const [current] = await tx
      .select()
      .from(authUsers)
      .where(eq(authUsers.id, user.id))
      .for('update')
    if (current?.journalInitializedAt) return
    const firstSelfHost =
      env.DEPLOYMENT_MODE === 'self-hosted' && !instance.bootstrapCompletedAt
    if (
      !env.AUTH_SIGNUP_ENABLED &&
      !firstSelfHost &&
      user.email !== env.AUTH_ADMIN_EMAIL
    ) {
      throw new Error('Registration is disabled')
    }
    if (firstSelfHost) {
      await tx.execute(
        sql`select set_config('roastbook.bootstrap', 'true', true)`,
      )
      for (const table of journalTables) {
        await tx.execute(
          sql`update ${sql.identifier(table)} set owner_id = ${user.id} where owner_id = ${instance.defaultUserId}`,
        )
      }
      const [provider] = await tx
        .select()
        .from(aiProviderCredentials)
        .where(eq(aiProviderCredentials.userId, instance.defaultUserId))
      if (provider)
        await tx
          .update(aiProviderCredentials)
          .set({
            userId: user.id,
            encryptedApiKey: encryptAiKey(
              decryptAiKey(
                provider.encryptedApiKey,
                provider.userId,
                provider.baseURL,
              ),
              user.id,
              provider.baseURL,
            ),
            updatedAt: new Date(),
          })
          .where(eq(aiProviderCredentials.userId, instance.defaultUserId))
      await tx.execute(
        sql`select set_config('roastbook.bootstrap', 'false', true)`,
      )
      await tx
        .update(instanceIdentity)
        .set({ defaultUserId: user.id, bootstrapCompletedAt: new Date() })
        .where(eq(instanceIdentity.id, 1))
    }
    if (!firstSelfHost) await createJournalDefaults(tx, user.id)
    await tx
      .update(authUsers)
      .set({ journalInitializedAt: new Date() })
      .where(eq(authUsers.id, user.id))
    if (firstSelfHost || user.email === env.AUTH_ADMIN_EMAIL)
      await tx
        .update(authUsers)
        .set({ role: 'admin' })
        .where(eq(authUsers.id, user.id))
  })
}

export async function defaultIdentity(): Promise<JournalIdentity> {
  const database = getControlDb()
  const [instance] = await database
    .select()
    .from(instanceIdentity)
    .where(eq(instanceIdentity.id, 1))
  if (!instance)
    throw new Error('Run database migrations before starting Roastbook')
  const [other] = await database
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(
      and(
        ne(authUsers.id, instance.defaultUserId),
        ne(authUsers.id, 'local'),
        isNull(authUsers.deletingAt),
      ),
    )
    .limit(1)
  if (other)
    throw new Error(
      'Authentication cannot be disabled while this database contains multiple users',
    )
  return {
    id: instance.defaultUserId,
    email: '',
    role: 'admin',
    authentication: false,
    authenticatedAt: null,
  }
}
