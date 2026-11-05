import '@tanstack/react-start/server-only'
import { requireMcpAuth } from '@better-auth/mcp'
import { and, eq, isNull } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { withJournalResponse } from '@/db/journal-response.server'
import { authUsers, oauthClient, oauthConsent } from '@/db/schema'
import { getServerEnv } from '@/lib/env.server'
import { getAuth } from './auth.server'

export const OAUTH_DISCOVERY_PATHS = new Set([
  '/.well-known/oauth-protected-resource',
  '/.well-known/oauth-protected-resource/api/mcp',
  '/.well-known/oauth-authorization-server/api/auth',
  '/api/auth/.well-known/oauth-authorization-server',
])

export function mcpAuthenticationRequired() {
  const env = getServerEnv()
  const headers = new Headers({ 'Cache-Control': 'no-store' })
  if (env.AUTH_ENABLED && env.PUBLIC_URL)
    headers.set(
      'WWW-Authenticate',
      `Bearer resource_metadata="${new URL('/.well-known/oauth-protected-resource/api/mcp', env.PUBLIC_URL).href}"`,
    )
  else headers.set('WWW-Authenticate', 'Bearer realm="Roastbook MCP"')
  return Response.json(
    {
      error: 'invalid_token',
      error_description: 'MCP authorization is required',
    },
    { status: 401, headers },
  )
}

export async function authorizeMcpRequest(
  request: Request,
  next: () => Promise<Response>,
) {
  const env = getServerEnv()
  if (!env.AUTH_ENABLED || !env.PUBLIC_URL) return mcpAuthenticationRequired()
  const protectedHandler = requireMcpAuth(
    getAuth(),
    async (_request, claims) => {
      if (
        typeof claims.sub !== 'string' ||
        typeof claims.client_id !== 'string' ||
        typeof claims.roastbook_grant !== 'string'
      )
        return mcpAuthenticationRequired()
      const [grant] = await getControlDb()
        .select({
          user: authUsers,
          scopes: oauthConsent.scopes,
          disabled: oauthClient.disabled,
        })
        .from(oauthConsent)
        .innerJoin(authUsers, eq(authUsers.id, oauthConsent.userId))
        .innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
        .where(
          and(
            eq(oauthConsent.id, claims.roastbook_grant),
            eq(oauthConsent.userId, claims.sub),
            eq(oauthConsent.clientId, claims.client_id),
            eq(authUsers.emailVerified, true),
            isNull(authUsers.deletingAt),
          ),
        )
      if (!grant || grant.disabled) return mcpAuthenticationRequired()
      const grantedScopes =
        typeof claims.scope === 'string'
          ? claims.scope
              .split(' ')
              .filter((scope) => grant.scopes.includes(scope))
          : []
      if (!grantedScopes.includes('mcp:read'))
        return Response.json(
          { error: 'insufficient_scope' },
          {
            status: 403,
            headers: {
              'WWW-Authenticate':
                'Bearer error="insufficient_scope", scope="mcp:read"',
            },
          },
        )
      return withJournalResponse(
        {
          id: grant.user.id,
          email: grant.user.email,
          role: grant.user.role,
          authentication: true,
          authenticatedAt: null,
          mcpScopes: grantedScopes,
        },
        next,
        { signal: request.signal },
      )
    },
    {
      resource: `${new URL(env.PUBLIC_URL).origin}/api/mcp`,
      challengeScopes: ['mcp:read'],
      requiredScopes: ['mcp:read'],
    },
  )
  // DPoP signs the public URL. Reverse proxies may expose an internal scheme
  // or host to the runtime, so use the configured resource, never forwarded input.
  const publicRequest = new Request(new URL('/api/mcp', env.PUBLIC_URL), {
    method: request.method,
    headers: request.headers,
  })
  const response = await protectedHandler(publicRequest)
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'private, no-store')
  headers.set('Vary', 'Authorization, Origin')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
