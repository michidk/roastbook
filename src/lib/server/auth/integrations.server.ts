import '@tanstack/react-start/server-only'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { and, count, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import { authUsers, integrationTokens } from '@/db/schema'
import { consumeReauthentication } from '@/lib/server/auth/reauthentication.server'
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
  reauthToken?: string
}) {
  const identity = requireIdentity()
  const scopes = requireScopes(input.scopes)
  if (input.expiresAt && input.expiresAt.getTime() <= Date.now())
    throw new Error('Choose an expiry date in the future')
  await consumeReauthentication('create-credential', input.reauthToken)
  const token = `${TOKEN_PREFIXES[input.kind]}${randomBytes(32).toString('base64url')}`
  // Count and insert under one per-account lock so parallel requests cannot
  // exceed the limit.
  await getControlDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`integration-credentials:${identity.id}:${input.kind}`}, 0))`,
    )
    const [existing] = await tx
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
    await tx.insert(integrationTokens).values({
      id: randomUUID(),
      userId: identity.id,
      kind: input.kind,
      name: input.name,
      tokenHash: hashIntegrationToken(token),
      tokenPrefix: token.slice(0, VISIBLE_TOKEN_CHARACTERS),
      scopes,
      expiresAt: input.expiresAt,
    })
  })
  return token
}

/** Renames a credential or changes its permissions without rotating it. */
export async function updateIntegrationCredential(input: {
  id: string
  name: string
  scopes: readonly string[]
  reauthToken?: string
}) {
  const identity = requireIdentity()
  const scopes = requireScopes(input.scopes)
  await consumeReauthentication('change-permissions', input.reauthToken)
  const [updated] = await getControlDb()
    .update(integrationTokens)
    .set({ name: input.name, scopes })
    .where(
      and(
        eq(integrationTokens.id, input.id),
        eq(integrationTokens.userId, identity.id),
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
  if (deleted) await forgetCredentialUsage(identity.id, deleted.id)
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
  kind: CredentialKind,
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
