import '@tanstack/react-start/server-only'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { and, count, desc, eq, gt, isNull, ne, or, sql } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import {
  accountJobs,
  adminAuditEvents,
  aiRequestLogs,
  authPasskeys,
  authRateLimits,
  authSessions,
  authUsers,
  authVerifications,
  beanPurchases,
  beans,
  cafeVisits,
  coffeeShops,
  gear,
  instanceIdentity,
  integrationTokens,
  recipes,
  roasters,
  shots,
} from '@/db/schema'
import { renderAccountEmail } from '@/lib/account-email'
import { DEMO_MODE } from '@/lib/build-mode'
import { getServerEnv } from '@/lib/env.server'
import { consumeReauthentication } from '@/lib/server/auth/reauthentication.server'
import { integrationRateLimitPrefixes } from '@/lib/server/integrations/rate-limit.server'
import { sendAccountEmail } from './email.server'

function accountIdentity() {
  const identity = requireIdentity()
  if (!identity.authentication)
    throw new Error('Account management is disabled')
  return identity
}
export function requireAdmin() {
  const identity = accountIdentity()
  if (identity.role !== 'admin')
    throw new Error('Administrator access is required')
  return identity
}
export async function getAccountState() {
  if (DEMO_MODE)
    return {
      ownerId: 'local',
      identity: null,
      exports: [],
    }
  const identity = requireIdentity()
  if (!identity.authentication)
    return {
      ownerId: identity.id,
      identity: null,
      exports: [],
    }
  const db = getControlDb()
  const exports = await db
    .select({
      id: accountJobs.id,
      status: accountJobs.status,
      createdAt: accountJobs.createdAt,
      expiresAt: accountJobs.expiresAt,
    })
    .from(accountJobs)
    .where(
      and(eq(accountJobs.userId, identity.id), eq(accountJobs.kind, 'export')),
    )
    .orderBy(desc(accountJobs.createdAt))
    .limit(10)
  return {
    ownerId: identity.id,
    identity: {
      id: identity.id,
      email: identity.email,
      role: identity.role,
    },
    exports,
  }
}
export async function listUsers(page: number) {
  requireAdmin()
  const db = getControlDb()
  const [users, [total]] = await Promise.all([
    db
      .select({
        id: authUsers.id,
        email: authUsers.email,
        role: authUsers.role,
        createdAt: authUsers.createdAt,
        deletingAt: authUsers.deletingAt,
      })
      .from(authUsers)
      .where(ne(authUsers.id, 'local'))
      .orderBy(desc(authUsers.createdAt), authUsers.id)
      .limit(50)
      .offset(page * 50),
    db
      .select({ count: count() })
      .from(authUsers)
      .where(ne(authUsers.id, 'local')),
  ])
  return { users, total: total?.count ?? 0, page }
}

/** One account's settings, passkeys, and journal and AI usage. */
export async function loadUser(userId: string) {
  requireAdmin()
  const db = getControlDb()
  const [user] = await db
    .select({
      id: authUsers.id,
      email: authUsers.email,
      role: authUsers.role,
      createdAt: authUsers.createdAt,
      deletingAt: authUsers.deletingAt,
      emailVerified: authUsers.emailVerified,
      lastLoginAt: authUsers.lastLoginAt,
      termsVersion: authUsers.termsVersion,
      termsAcceptedAt: authUsers.termsAcceptedAt,
      newsletterOptIn: authUsers.newsletterOptIn,
      journalInitializedAt: authUsers.journalInitializedAt,
    })
    .from(authUsers)
    .where(and(eq(authUsers.id, userId), ne(authUsers.id, 'local')))
  if (!user) throw new Error('User not found')
  const owned = (table: typeof shots | typeof beans | typeof roasters) =>
    db
      .select({ count: count() })
      .from(table)
      .where(eq(table.ownerId, userId))
      .then(([row]) => row?.count ?? 0)
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [passkeys, sessions, tokens, ai, ...counts] = await Promise.all([
    db
      .select({
        name: authPasskeys.name,
        deviceType: authPasskeys.deviceType,
        backedUp: authPasskeys.backedUp,
        createdAt: authPasskeys.createdAt,
      })
      .from(authPasskeys)
      .where(eq(authPasskeys.userId, userId))
      .orderBy(authPasskeys.createdAt),
    db
      .select({ count: count() })
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, userId),
          gt(authSessions.expiresAt, new Date()),
        ),
      ),
    db
      .select({ count: count() })
      .from(integrationTokens)
      .where(
        and(
          eq(integrationTokens.userId, userId),
          gt(integrationTokens.expiresAt, new Date()),
        ),
      ),
    db
      .select({
        total: count(),
        recent:
          sql<number>`count(*) filter (where ${aiRequestLogs.createdAt} >= ${since})`.mapWith(
            Number,
          ),
        tokens:
          sql<number>`coalesce(sum(${aiRequestLogs.totalTokens}), 0)`.mapWith(
            Number,
          ),
        lastAt: sql<Date | null>`max(${aiRequestLogs.createdAt})`.mapWith(
          (value) => (value ? new Date(value) : null),
        ),
      })
      .from(aiRequestLogs)
      .where(eq(aiRequestLogs.ownerId, userId)),
    ...[
      shots,
      beans,
      cafeVisits,
      coffeeShops,
      roasters,
      gear,
      recipes,
      beanPurchases,
    ].map((table) => owned(table as typeof shots)),
  ])
  const [
    brews,
    beanCount,
    visits,
    cafes,
    roasterCount,
    gearCount,
    recipeCount,
    purchases,
  ] = counts
  return {
    user,
    passkeys,
    activeSessions: sessions[0]?.count ?? 0,
    integrationTokens: tokens[0]?.count ?? 0,
    usage: {
      brews: brews ?? 0,
      beans: beanCount ?? 0,
      purchases: purchases ?? 0,
      visits: visits ?? 0,
      cafes: cafes ?? 0,
      roasters: roasterCount ?? 0,
      gear: gearCount ?? 0,
      recipes: recipeCount ?? 0,
    },
    ai: {
      requests: ai[0]?.total ?? 0,
      requestsLast30Days: ai[0]?.recent ?? 0,
      tokens: ai[0]?.tokens ?? 0,
      lastRequestAt: ai[0]?.lastAt ?? null,
    },
  }
}

type ControlTransaction = Parameters<
  Parameters<ReturnType<typeof getControlDb>['transaction']>[0]
>[0]
async function authorizeAdminMutation(tx: ControlTransaction, actorId: string) {
  await tx
    .select()
    .from(instanceIdentity)
    .where(eq(instanceIdentity.id, 1))
    .for('update')
  const [actor] = await tx
    .select()
    .from(authUsers)
    .where(eq(authUsers.id, actorId))
  if (actor?.role !== 'admin' || actor.deletingAt)
    throw new Error('Administrator access is required')
}
async function protectLastAdmin(tx: ControlTransaction, id: string) {
  await tx
    .select()
    .from(instanceIdentity)
    .where(eq(instanceIdentity.id, 1))
    .for('update')
  const [target] = await tx
    .select()
    .from(authUsers)
    .where(eq(authUsers.id, id))
    .for('update')
  if (!target || id === 'local') throw new Error('User not found')
  if (target.role === 'admin' && !target.deletingAt) {
    const [other] = await tx
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(
        and(
          eq(authUsers.role, 'admin'),
          isNull(authUsers.deletingAt),
          ne(authUsers.id, id),
          ne(authUsers.id, 'local'),
        ),
      )
      .limit(1)
    if (!other)
      throw new Error('The last administrator cannot be removed or demoted')
  }
  return target
}
export async function changeUserRole(
  userId: string,
  role: 'user' | 'admin',
  reauthToken?: string,
) {
  const actor = requireAdmin()
  await consumeReauthentication('change-user-role', reauthToken)
  await getControlDb().transaction(async (tx) => {
    await authorizeAdminMutation(tx, actor.id)
    if (role === 'user') await protectLastAdmin(tx, userId)
    else
      await tx
        .select()
        .from(instanceIdentity)
        .where(eq(instanceIdentity.id, 1))
        .for('update')
    const [target] = await tx
      .update(authUsers)
      .set({ role, updatedAt: new Date() })
      .where(
        and(
          eq(authUsers.id, userId),
          isNull(authUsers.deletingAt),
          ne(authUsers.id, 'local'),
        ),
      )
      .returning()
    if (!target) throw new Error('User not found')
    await tx
      .insert(adminAuditEvents)
      .values({ actorId: actor.id, targetId: userId, action: `role:${role}` })
  })
}
async function scheduleDeletion(
  tx: ControlTransaction,
  userId: string,
  actorId: string,
) {
  const target = await protectLastAdmin(tx, userId)
  if (target.deletingAt) return
  await tx
    .update(authUsers)
    .set({ deletingAt: new Date(), updatedAt: new Date() })
    .where(eq(authUsers.id, userId))
  await tx.delete(authSessions).where(eq(authSessions.userId, userId))
  await tx.delete(integrationTokens).where(eq(integrationTokens.userId, userId))
  await tx
    .delete(authRateLimits)
    .where(
      or(
        ...integrationRateLimitPrefixes(userId).map(
          (prefix) =>
            sql`left(${authRateLimits.key}, ${prefix.length}) = ${prefix}`,
        ),
      ),
    )
  await tx
    .insert(accountJobs)
    .values({ id: randomUUID(), userId, kind: 'delete' })
  await tx
    .insert(adminAuditEvents)
    .values({ actorId, targetId: userId, action: 'delete' })
}
export async function removeUser(userId: string, reauthToken?: string) {
  const actor = requireAdmin()
  await consumeReauthentication('delete-user', reauthToken)
  await getControlDb().transaction(async (tx) => {
    await authorizeAdminMutation(tx, actor.id)
    await scheduleDeletion(tx, userId, actor.id)
  })
}
export async function requestAccountDeletion(reauthToken?: string) {
  const identity = accountIdentity()
  await consumeReauthentication('delete-account', reauthToken)
  const token = randomBytes(32).toString('base64url')
  const hash = createHash('sha256').update(token).digest('hex')
  await getControlDb().transaction(async (tx) => {
    await tx
      .delete(authVerifications)
      .where(eq(authVerifications.identifier, `delete:${identity.id}`))
    await tx.insert(authVerifications).values({
      id: randomUUID(),
      identifier: `delete:${identity.id}`,
      value: hash,
      expiresAt: new Date(Date.now() + 600_000),
    })
  })
  const url = new URL('/settings/account', getServerEnv().PUBLIC_URL)
  url.hash = new URLSearchParams({ delete: token }).toString()
  await sendAccountEmail(
    identity.email,
    await renderAccountEmail({ kind: 'delete-account', url: url.href }),
  )
}
export async function confirmAccountDeletion(token: string) {
  const identity = accountIdentity()
  await getControlDb().transaction(async (tx) => {
    const [used] = await tx
      .delete(authVerifications)
      .where(
        and(
          eq(authVerifications.identifier, `delete:${identity.id}`),
          eq(
            authVerifications.value,
            createHash('sha256').update(token).digest('hex'),
          ),
          gt(authVerifications.expiresAt, new Date()),
        ),
      )
      .returning()
    if (!used) throw new Error('This confirmation is invalid or expired')
    await scheduleDeletion(tx, identity.id, identity.id)
  })
}
export async function requestAccountExport(reauthToken?: string) {
  const identity = accountIdentity()
  await consumeReauthentication('export-account', reauthToken)
  await getControlDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${identity.id}, 1))`,
    )
    const [recent] = await tx
      .select({ id: accountJobs.id })
      .from(accountJobs)
      .where(
        and(
          eq(accountJobs.userId, identity.id),
          eq(accountJobs.kind, 'export'),
          gt(accountJobs.createdAt, new Date(Date.now() - 3600_000)),
        ),
      )
      .limit(1)
    if (recent) throw new Error('You can request one export per hour')
    await tx
      .insert(accountJobs)
      .values({ id: randomUUID(), userId: identity.id, kind: 'export' })
  })
}
