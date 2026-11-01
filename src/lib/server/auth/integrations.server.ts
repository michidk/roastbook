import '@tanstack/react-start/server-only'
import { randomBytes, randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import { integrationTokens } from '@/db/schema'
import { hashIntegrationToken } from './request.server'

export async function createIntegrationToken(
  kind: 'mcp' | 'shottimer',
  name: string,
) {
  const identity = requireIdentity()
  if (
    identity.authentication &&
    (!identity.authenticatedAt ||
      Date.now() - identity.authenticatedAt.getTime() > 600_000)
  )
    throw new Error('Sign in again before creating credentials')
  const token = randomBytes(32).toString('base64url')
  await getControlDb().transaction(async (tx) => {
    if (kind === 'shottimer')
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
