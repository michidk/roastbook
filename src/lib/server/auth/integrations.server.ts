import '@tanstack/react-start/server-only'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { and, count, desc, eq, gt, isNull, lt, or } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import {
  type JournalIdentity,
  requireIdentity,
} from '@/db/journal-context.server'
import { authUsers, integrationTokens } from '@/db/schema'
import {
  type IntegrationScope,
  normalizeScopes,
} from '@/modules/integrations/scopes'
import { forgetCredentialUsage } from '../integrations/rate-limit.server'

export type CredentialKind = 'api' | 'mcp'

const MAX_CREDENTIALS_PER_KIND = 25
const TOKEN_PREFIXES = { api: 'rbk_api_', mcp: 'rbk_mcp_' } as const
/** Characters of a token kept in plain text so owners can tell keys apart. */
const VISIBLE_TOKEN_CHARACTERS = 12

export function hashIntegrationToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function requireRecentSignIn(identity: JournalIdentity, action: string) {
  if (
    identity.authentication &&
    (!identity.authenticatedAt ||
      Date.now() - identity.authenticatedAt.getTime() > 600_000)
  )
    throw new Error(`Sign in again before ${action}`)
}

/** The shottimer device token: one per account, valid for a year. */
export async function createIntegrationToken(kind: 'shottimer', name: string) {
  const identity = requireIdentity()
  requireRecentSignIn(identity, 'creating credentials')
  const token = randomBytes(32).toString('base64url')
  await getControlDb().transaction(async (tx) => {
    await tx
      .delete(integrationTokens)
      .where(
        and(
          eq(integrationTokens.userId, identity.id),
          eq(integrationTokens.kind, kind),
        ),
      )
    await tx.insert(integrationTokens).values({
      id: randomUUID(),
      userId: identity.id,
      kind,
      name,
      tokenHash: hashIntegrationToken(token),
      expiresAt: new Date(Date.now() + 365 * 86400_000),
    })
  })
  return token
}

function requireScopes(scopes: readonly string[]) {
  const normalized = normalizeScopes(scopes)
  if (!normalized.length) throw new Error('Choose at least one permission')
  return normalized
}

/**
 * Issues an API key or MCP token. The token is returned once; only its hash
 * and a short prefix are stored.
 */
export async function createIntegrationCredential(input: {
  kind: CredentialKind
  name: string
  scopes: readonly string[]
  expiresAt: Date | null
}) {
  const identity = requireIdentity()
  requireRecentSignIn(identity, 'creating credentials')
  const scopes = requireScopes(input.scopes)
  if (input.expiresAt && input.expiresAt.getTime() <= Date.now())
    throw new Error('Choose an expiry date in the future')
  const [existing] = await getControlDb()
    .select({ count: count() })
    .from(integrationTokens)
    .where(
      and(
        eq(integrationTokens.userId, identity.id),
        eq(integrationTokens.kind, input.kind),
      ),
    )
  if ((existing?.count ?? 0) >= MAX_CREDENTIALS_PER_KIND)
    throw new Error('Revoke an unused key before creating another')
  const token = `${TOKEN_PREFIXES[input.kind]}${randomBytes(32).toString('base64url')}`
  await getControlDb()
    .insert(integrationTokens)
    .values({
      id: randomUUID(),
      userId: identity.id,
      kind: input.kind,
      name: input.name,
      tokenHash: hashIntegrationToken(token),
      tokenPrefix: token.slice(0, VISIBLE_TOKEN_CHARACTERS),
      scopes,
      expiresAt: input.expiresAt,
    })
  return token
}

/** Renames a credential or changes its permissions without rotating it. */
export async function updateIntegrationCredential(input: {
  id: string
  name: string
  scopes: readonly string[]
}) {
  const identity = requireIdentity()
  requireRecentSignIn(identity, 'changing permissions')
  const [updated] = await getControlDb()
    .update(integrationTokens)
    .set({ name: input.name, scopes: requireScopes(input.scopes) })
    .where(
      and(
        eq(integrationTokens.id, input.id),
        eq(integrationTokens.userId, identity.id),
        or(
          eq(integrationTokens.kind, 'api'),
          eq(integrationTokens.kind, 'mcp'),
        ),
      ),
    )
    .returning({ id: integrationTokens.id })
  if (!updated) throw new Error('Key not found')
}

export async function revokeIntegrationCredential(id: string) {
  const identity = requireIdentity()
  const [deleted] = await getControlDb()
    .delete(integrationTokens)
    .where(
      and(
        eq(integrationTokens.id, id),
        eq(integrationTokens.userId, identity.id),
      ),
    )
    .returning({ id: integrationTokens.id })
  if (deleted) await forgetCredentialUsage(deleted.id)
}

export async function listIntegrationCredentials(kind: CredentialKind) {
  const identity = requireIdentity()
  const rows = await getControlDb()
    .select({
      id: integrationTokens.id,
      name: integrationTokens.name,
      tokenPrefix: integrationTokens.tokenPrefix,
      scopes: integrationTokens.scopes,
      createdAt: integrationTokens.createdAt,
      expiresAt: integrationTokens.expiresAt,
      lastUsedAt: integrationTokens.lastUsedAt,
    })
    .from(integrationTokens)
    .where(
      and(
        eq(integrationTokens.userId, identity.id),
        eq(integrationTokens.kind, kind),
      ),
    )
    .orderBy(desc(integrationTokens.createdAt))
  const now = Date.now()
  return rows.map((row) => ({
    ...row,
    scopes: normalizeScopes(row.scopes),
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    expired: row.expiresAt !== null && row.expiresAt.getTime() <= now,
  }))
}

/** Resolves a bearer token for one integration kind, ignoring expired ones. */
export async function findIntegrationCredential(
  token: string,
  kind: CredentialKind | 'shottimer',
) {
  const [match] = await getControlDb()
    .select({
      user: authUsers,
      id: integrationTokens.id,
      scopes: integrationTokens.scopes,
    })
    .from(integrationTokens)
    .innerJoin(authUsers, eq(integrationTokens.userId, authUsers.id))
    .where(
      and(
        eq(integrationTokens.tokenHash, hashIntegrationToken(token)),
        eq(integrationTokens.kind, kind),
        or(
          isNull(integrationTokens.expiresAt),
          gt(integrationTokens.expiresAt, new Date()),
        ),
        isNull(authUsers.deletingAt),
      ),
    )
    .limit(1)
  if (!match) return null
  return {
    id: match.id,
    user: match.user,
    scopes: normalizeScopes(match.scopes) as IntegrationScope[],
  }
}

/** Records use at most once a minute to keep requests cheap. */
export async function touchIntegrationCredential(id: string) {
  const now = new Date()
  await getControlDb()
    .update(integrationTokens)
    .set({ lastUsedAt: now })
    .where(
      and(
        eq(integrationTokens.id, id),
        or(
          isNull(integrationTokens.lastUsedAt),
          lt(integrationTokens.lastUsedAt, new Date(now.getTime() - 60_000)),
        ),
      ),
    )
}
