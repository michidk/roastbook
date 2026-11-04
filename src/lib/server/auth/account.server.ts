import '@tanstack/react-start/server-only'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { and, count, desc, eq, gt, isNull, ne, sql } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import {
  accountJobs,
  adminAuditEvents,
  authSessions,
  authUsers,
  authVerifications,
  instanceIdentity,
  integrationTokens,
} from '@/db/schema'
import { renderAccountEmail } from '@/lib/account-email'
import { DEMO_MODE } from '@/lib/build-mode'
import { getServerEnv } from '@/lib/env.server'
import { sendAccountEmail } from './email.server'
import { createIntegrationToken } from './integrations.server'

function accountIdentity() {
  const identity = requireIdentity()
  if (!identity.authentication)
    throw new Error('Account management is disabled')
  return identity
}
function requireFresh() {
  const identity = accountIdentity()
  if (
    !identity.authenticatedAt ||
    Date.now() - identity.authenticatedAt.getTime() > 600_000
  )
    throw new Error('Sign in again to confirm this action')
  return identity
}
export function requireAdmin(fresh = false) {
  const identity = fresh ? requireFresh() : accountIdentity()
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
export async function changeUserRole(userId: string, role: 'user' | 'admin') {
  const actor = requireAdmin(true)
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
    .insert(accountJobs)
    .values({ id: randomUUID(), userId, kind: 'delete' })
  await tx
    .insert(adminAuditEvents)
    .values({ actorId, targetId: userId, action: 'delete' })
}
export async function removeUser(userId: string) {
  const actor = requireAdmin(true)
  await getControlDb().transaction(async (tx) => {
    await authorizeAdminMutation(tx, actor.id)
    await scheduleDeletion(tx, userId, actor.id)
  })
}
export async function requestAccountDeletion() {
  const identity = requireFresh()
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
  const url = new URL('/settings/account', getServerEnv().AUTH_URL)
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
export async function requestAccountExport() {
  const identity = requireFresh()
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
export async function issueToken(kind: 'mcp' | 'shottimer', name: string) {
  const identity = requireIdentity()
  const [total] = await getControlDb()
    .select({ count: count() })
    .from(integrationTokens)
    .where(eq(integrationTokens.userId, identity.id))
  if ((total?.count ?? 0) >= 10)
    throw new Error('Revoke an existing token before creating another')
  return createIntegrationToken(kind, name)
}
export async function revokeToken(id: string) {
  const identity = requireIdentity()
  await getControlDb()
    .delete(integrationTokens)
    .where(
      and(
        eq(integrationTokens.id, id),
        eq(integrationTokens.userId, identity.id),
      ),
    )
}

export async function listIntegrationTokens() {
  const identity = requireIdentity()
  return getControlDb()
    .select({
      id: integrationTokens.id,
      name: integrationTokens.name,
      kind: integrationTokens.kind,
      expiresAt: integrationTokens.expiresAt,
    })
    .from(integrationTokens)
    .where(eq(integrationTokens.userId, identity.id))
}
