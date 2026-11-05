import '@tanstack/react-start/server-only'
import { and, eq, inArray } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { oauthGrantScopes } from '@/db/schema'
import {
  allScopes,
  type IntegrationScope,
  normalizeScopes,
  scopesAllowedByProtocol,
} from '@/modules/integrations/scopes'

/**
 * Applications authorized before scopes were selectable keep what they could
 * do then: read everything and, with mcp:write, log brews.
 */
function legacyScopes(protocolScopes: readonly string[]) {
  return normalizeScopes([
    ...allScopes('read'),
    ...(protocolScopes.includes('mcp:write') ? ['brews:write'] : []),
  ])
}

/** What an application may do: the owner's choice within its OAuth scopes. */
export function effectiveGrantScopes(
  approved: readonly string[] | undefined,
  protocolScopes: readonly string[],
): IntegrationScope[] {
  const allowed = new Set<string>(scopesAllowedByProtocol(protocolScopes))
  return normalizeScopes(
    (approved ?? legacyScopes(protocolScopes)).filter((scope) =>
      allowed.has(scope),
    ),
  )
}

export async function loadApprovedGrantScopes(
  userId: string,
  clientIds: readonly string[],
) {
  if (!clientIds.length) return new Map<string, string[]>()
  const rows = await getControlDb()
    .select({
      clientId: oauthGrantScopes.clientId,
      scopes: oauthGrantScopes.scopes,
    })
    .from(oauthGrantScopes)
    .where(
      and(
        eq(oauthGrantScopes.userId, userId),
        inArray(oauthGrantScopes.clientId, [...clientIds]),
      ),
    )
  return new Map(rows.map((row) => [row.clientId, row.scopes]))
}

export async function saveApprovedGrantScopes(
  userId: string,
  clientId: string,
  scopes: readonly IntegrationScope[],
) {
  const values = [...scopes]
  await getControlDb()
    .insert(oauthGrantScopes)
    .values({ userId, clientId, scopes: values })
    .onConflictDoUpdate({
      target: [oauthGrantScopes.userId, oauthGrantScopes.clientId],
      set: { scopes: values, updatedAt: new Date() },
    })
}
