import '@tanstack/react-start/server-only'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { and, count, desc, eq, ne, type SQL, sql } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import {
  accountJobs,
  aiWeeklyUsage,
  authUsers,
  beans,
  cafeVisits,
  integrationTokens,
  shots,
} from '@/db/schema'
import { renderAccountEmail } from '@/lib/account-email'
import { aiAllowanceWeek } from '@/lib/ai-allowance'
import { getServerEnv } from '@/lib/env.server'
import { providedAiConfig } from '@/lib/server/ai-allowance.server'
import { sendAccountEmail } from '@/lib/server/auth/email.server'
import {
  assertControlChanges,
  assertControlCondition,
  runControlBatch,
} from './control-batch.server'
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
function activeAccount(id: string) {
  return assertControlCondition(
    sql`exists(select 1 from auth_users where id=${id} and deleting_at is null)`,
  )
}
function activeAdmin(id: string) {
  return assertControlCondition(
    sql`exists(select 1 from auth_users where id=${id} and role='admin' and deleting_at is null)`,
  )
}
function validTarget(id: string) {
  return assertControlCondition(
    sql`${id}<>'local' and exists(select 1 from auth_users where id=${id} and deleting_at is null)`,
  )
}
function protectLastAdmin(id: string) {
  return assertControlCondition(
    sql`not exists(select 1 from auth_users where id=${id} and role='admin' and deleting_at is null) or exists(select 1 from auth_users where id<>${id} and id<>'local' and role='admin' and deleting_at is null)`,
  )
}
function audit(actor: string, target: string, action: string) {
  return sql`insert into admin_audit_events(actor_id,target_id,action) values (${actor},${target},${action})`
}
function deletion(userId: string, actorId: string): SQL[] {
  return [
    ...validTarget(userId),
    ...protectLastAdmin(userId),
    sql`update auth_users set deleting_at=${Date.now()},updated_at=${Date.now()} where id=${userId}`,
    ...assertControlChanges(1),
    sql`delete from auth_sessions where user_id=${userId}`,
    sql`delete from integration_tokens where user_id=${userId}`,
    sql`insert into account_jobs(id,user_id,kind) values (${randomUUID()},${userId},'delete')`,
    audit(actorId, userId, 'delete'),
  ]
}
export async function getAccountState() {
  const identity = accountIdentity()
  const exports = await getControlDb()
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
    providedAiAvailable: !!providedAiConfig(),
    identity: { id: identity.id, email: identity.email, role: identity.role },
    exports,
  }
}
export async function listUsers(page: number) {
  const actor = requireAdmin()
  await runControlBatch(
    activeAdmin(actor.id),
    'Administrator access is required',
  )
  const database = getControlDb()
  const [users, [total]] = await Promise.all([
    database
      .select({
        id: authUsers.id,
        email: authUsers.email,
        role: authUsers.role,
        createdAt: authUsers.createdAt,
        deletingAt: authUsers.deletingAt,
        lastLoginAt: authUsers.lastLoginAt,
        aiWeeklyLimit: authUsers.aiWeeklyLimit,
        aiRequestsThisWeek: sql<number>`coalesce((select ${aiWeeklyUsage.requests} from ${aiWeeklyUsage} where ${aiWeeklyUsage.userId}=${authUsers.id} and ${aiWeeklyUsage.weekStart}=${aiAllowanceWeek().start.getTime()}),0)`,
        brews: sql<number>`(select count(*) from ${shots} where ${shots.ownerId}=${authUsers.id})`,
        beans: sql<number>`(select count(*) from ${beans} where ${beans.ownerId}=${authUsers.id})`,
        visits: sql<number>`(select count(*) from ${cafeVisits} where ${cafeVisits.ownerId}=${authUsers.id})`,
      })
      .from(authUsers)
      .where(ne(authUsers.id, 'local'))
      .orderBy(desc(authUsers.createdAt), authUsers.id)
      .limit(50)
      .offset(page * 50),
    database
      .select({ count: count() })
      .from(authUsers)
      .where(ne(authUsers.id, 'local')),
  ])
  return { users, total: total?.count ?? 0, page }
}
export async function changeUserRole(userId: string, role: 'user' | 'admin') {
  const actor = requireAdmin(true)
  await runControlBatch(
    [
      ...activeAdmin(actor.id),
      ...validTarget(userId),
      ...(role === 'user' ? protectLastAdmin(userId) : []),
      sql`update auth_users set role=${role},updated_at=${Date.now()} where id=${userId}`,
      ...assertControlChanges(1),
      audit(actor.id, userId, `role:${role}`),
    ],
    'User unavailable or the last administrator cannot be demoted',
  )
}
export async function removeUser(userId: string) {
  const actor = requireAdmin(true)
  await runControlBatch(
    [...activeAdmin(actor.id), ...deletion(userId, actor.id)],
    'User unavailable or the last administrator cannot be removed',
  )
}
export async function requestAccountDeletion() {
  const identity = requireFresh()
  const token = randomBytes(32).toString('base64url')
  await runControlBatch(
    [
      ...activeAccount(identity.id),
      sql`delete from auth_verifications where identifier=${`delete:${identity.id}`}`,
      sql`insert into auth_verifications(id,identifier,value,expires_at) values (${randomUUID()},${`delete:${identity.id}`},${createHash('sha256').update(token).digest('hex')},${Date.now() + 600_000})`,
    ],
    'Account is unavailable',
  )
  const url = new URL('/settings/account', getServerEnv().AUTH_URL)
  url.hash = new URLSearchParams({ delete: token }).toString()
  await sendAccountEmail(
    identity.email,
    renderAccountEmail({ kind: 'delete-account', url: url.href }),
  )
}
export async function confirmAccountDeletion(token: string) {
  const identity = accountIdentity()
  await runControlBatch(
    [
      ...activeAccount(identity.id),
      sql`delete from auth_verifications where identifier=${`delete:${identity.id}`} and value=${createHash('sha256').update(token).digest('hex')} and expires_at>${Date.now()}`,
      ...assertControlChanges(1),
      ...deletion(identity.id, identity.id),
    ],
    'Confirmation invalid or expired, or the last administrator cannot be removed',
  )
}
export async function requestAccountExport() {
  const identity = requireFresh()
  await runControlBatch(
    [
      ...activeAccount(identity.id),
      ...assertControlCondition(
        sql`not exists(select 1 from account_jobs where user_id=${identity.id} and kind='export' and created_at>${Date.now() - 3600_000})`,
      ),
      sql`insert into account_jobs(id,user_id,kind) values (${randomUUID()},${identity.id},'export')`,
    ],
    'You can request one export per hour',
  )
}
export async function issueToken(kind: 'mcp' | 'shottimer', name: string) {
  return createIntegrationToken(kind, name)
}
export async function revokeToken(id: string) {
  const identity = accountIdentity()
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
  const identity = accountIdentity()
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
export async function changeUserAiLimit(userId: string, limit: number) {
  const actor = requireAdmin(true)
  if (!providedAiConfig()) throw new Error('Provided AI is unavailable')
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 1_000_000)
    throw new Error('Invalid weekly request allowance')
  await runControlBatch(
    [
      ...activeAdmin(actor.id),
      ...validTarget(userId),
      sql`update auth_users set ai_weekly_limit=${limit},updated_at=${Date.now()} where id=${userId}`,
      ...assertControlChanges(1),
      audit(actor.id, userId, `ai-weekly-limit:${limit}`),
    ],
    'Administrator or user is unavailable',
  )
}
