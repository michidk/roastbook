import '@tanstack/react-start/server-only'
import { verifyOAuthQueryParams } from '@better-auth/oauth-provider'
import { and, eq } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { requireIdentity } from '@/db/journal-context.server'
import { oauthClient, oauthConsent } from '@/db/schema'
import { coordinateRevokeGrant } from '@/lib/server/auth/oauth-coordination.server'
import { getAuth } from './auth.server'
import { MCP_SCOPES } from './mcp-options.server'

export async function loadConsent(query: string) {
  const identity = requireIdentity()
  if (!identity.authentication)
    throw new Error('Sign in to authorize an application')
  const auth = getAuth()
  const { secret } = await auth.$context
  if (!(await verifyOAuthQueryParams(query, secret)))
    throw new Error(
      'This authorization request is invalid or expired. Start again from your application.',
    )
  // The provider signed these parameters only after validating the registered
  // callback, including native loopback port matching. Never reserialize them.
  const params = new URLSearchParams(query)
  const id = params.get('client_id')
  if (!id) throw new Error('Missing client')
  const [client] = await getControlDb()
    .select({
      clientId: oauthClient.clientId,
      name: oauthClient.name,
      disabled: oauthClient.disabled,
    })
    .from(oauthClient)
    .where(eq(oauthClient.clientId, id))
  const scopes = (params.get('scope') ?? '').split(' ').filter(Boolean)
  const redirect = params.get('redirect_uri')
  if (
    !client ||
    client.disabled ||
    !redirect ||
    !scopes.includes('mcp:read') ||
    scopes.some((scope) => !MCP_SCOPES.includes(scope))
  )
    throw new Error('This application requested unsupported access')
  return {
    clientId: client.clientId,
    clientName: client.name ?? 'Unnamed application',
    redirectUri: redirect,
    email: identity.email,
    scopes,
  }
}

export async function listOAuthGrants() {
  const identity = requireIdentity()
  if (!identity.authentication) return []
  return getControlDb()
    .select({
      id: oauthConsent.id,
      clientId: oauthConsent.clientId,
      name: oauthClient.name,
      scopes: oauthConsent.scopes,
      createdAt: oauthConsent.createdAt,
    })
    .from(oauthConsent)
    .innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
    .where(eq(oauthConsent.userId, identity.id))
}

export async function revokeOAuthGrant(id: string) {
  const identity = requireIdentity()
  if (
    !identity.authentication ||
    !identity.authenticatedAt ||
    Date.now() - identity.authenticatedAt.getTime() > 600_000
  )
    throw new Error('Sign in again to disconnect an application')
  const [connection] = await getControlDb()
    .select({ clientId: oauthConsent.clientId })
    .from(oauthConsent)
    .where(and(eq(oauthConsent.id, id), eq(oauthConsent.userId, identity.id)))
  if (!connection) throw new Error('Application connection not found')
  await coordinateRevokeGrant({
    clientId: connection.clientId,
    userId: identity.id,
    id,
  })
}
