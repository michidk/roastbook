import '@tanstack/react-start/server-only'
import { eq } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import type { JournalIdentity } from '@/db/journal-context.server'
import { withJournalResponse } from '@/db/journal-response.server'
import { authUsers } from '@/db/schema'
import { DEMO_MODE } from '@/lib/build-mode'
import { getServerEnv } from '@/lib/env.server'
import { requestOrigin } from '@/lib/request-origin'
import {
  defaultIdentity,
  initializeUser,
} from '@/lib/server/auth/identity.server'
import { findIntegrationCredential } from '@/lib/server/auth/integrations.server'
import {
  API_TRY_HEADER,
  isApiDocsPath,
  isApiTryPath,
} from '@/lib/server/integrations/api-docs.server'
import { INTEGRATION_SCOPES } from '@/modules/integrations/scopes'
import { validateMcpRequest } from '../mcp/http-policy.server'
import { getAuth } from './auth.server'
import { handleAuthRequest } from './http.server'
import { authorizeMcpRequest } from './mcp-authorization.server'
import { isAdminEmail } from './registration.server'

export function isApiPath(path: string) {
  return path === '/api/v1' || path.startsWith('/api/v1/')
}

/** The API description and reference, readable without a key. */
export function isPublicApiPath(path: string) {
  return (
    path === '/api/v1/openapi.json' ||
    (isApiPath(path) && isApiDocsPath(path.slice('/api/v1'.length)))
  )
}

function integrationKind(path: string) {
  if (path === '/api/mcp') return 'mcp'
  if (isApiPath(path)) return 'api'
  return null
}

async function resolveIdentity(request: Request) {
  const cookies: string[] = []
  const identity = await resolveJournalIdentity(request, cookies)
  return { identity, cookies }
}

async function resolveJournalIdentity(
  request: Request,
  cookies: string[],
): Promise<JournalIdentity | null> {
  if (DEMO_MODE)
    return {
      id: 'local',
      email: '',
      role: 'user',
      authentication: false,
      authenticatedAt: null,
    }
  const path = new URL(request.url).pathname
  const integration = integrationKind(path)
  const env = getServerEnv()
  if (integration) {
    // Integrations authenticate with their own bearer token, never a session.
    const token = /^Bearer ([A-Za-z0-9_-]{32,200})$/i.exec(
      request.headers.get('authorization') ?? '',
    )?.[1]
    if (!token) return null
    const match = await findIntegrationCredential(token, integration)
    if (!match) return null
    return {
      id: match.user.id,
      email: match.user.email,
      role: match.user.role,
      authentication: env.AUTH_ENABLED,
      authenticatedAt: null,
      integration: {
        channel: integration,
        credentialId: match.id,
        scopes: match.scopes,
      },
    }
  }
  if (!env.AUTH_ENABLED) return defaultIdentity()
  const { response: session, headers } = await getAuth().api.getSession({
    headers: request.headers,
    returnHeaders: true,
  })
  cookies.push(...headers.getSetCookie())
  if (!session || session.user.deletingAt || !session.user.emailVerified)
    return null
  await initializeUser(session.user)
  const [current] = await getControlDb()
    .select({ role: authUsers.role })
    .from(authUsers)
    .where(eq(authUsers.id, session.user.id))
  // AUTH_ADMIN_EMAIL can change between deploys; listed users are promoted on
  // their next request. Admins granted in the UI or database stay admins.
  const listed = isAdminEmail(env, session.user.email)
  if (listed && current?.role !== 'admin')
    await getControlDb()
      .update(authUsers)
      .set({ role: 'admin' })
      .where(eq(authUsers.id, session.user.id))
  return {
    id: session.user.id,
    email: session.user.email,
    role: listed || current?.role === 'admin' ? 'admin' : 'user',
    authentication: true,
    authenticatedAt: session.session.createdAt,
    sessionId: session.session.id,
  }
}

export async function handleJournalRequest(
  request: Request,
  next: () => Promise<Response>,
): Promise<Response> {
  if (DEMO_MODE) return next()
  const path = new URL(request.url).pathname
  if (
    path === '/api/health' ||
    (isPublicApiPath(path) && request.method === 'GET') ||
    (/^\/offline-shell\/?$/.test(path) && request.method === 'GET')
  )
    return next()
  const authResponse = await handleAuthRequest(request)
  if (authResponse) return authResponse
  if (path === '/api/mcp') {
    const rejected = await validateMcpRequest(request)
    if (rejected) return rejected
  }
  const { identity, cookies } = await resolveIdentity(request)
  const response = await handlePrivateRequest(request, next, identity)
  if (!cookies.length) return response
  const headers = new Headers(response.headers)
  for (const cookie of cookies) headers.append('Set-Cookie', cookie)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * The API reference's test requests run as the signed-in account with every
 * permission, like the app itself, and count against the shared rate limit.
 */
function asReferenceSession(identity: JournalIdentity): JournalIdentity {
  return {
    ...identity,
    integration: {
      channel: 'api',
      credentialId: 'session:api-reference',
      scopes: INTEGRATION_SCOPES,
    },
  }
}

async function handlePrivateRequest(
  request: Request,
  next: () => Promise<Response>,
  identity: JournalIdentity | null,
) {
  const path = new URL(request.url).pathname
  if (!identity) {
    if (path === '/api/mcp') return authorizeMcpRequest(request, next)
    if (isApiPath(path))
      return Response.json(
        {
          error: {
            code: 'unauthorized',
            message:
              'Send an API key from Settings → API as Authorization: Bearer <key>',
          },
        },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store',
            'WWW-Authenticate': 'Bearer realm="Roastbook API"',
          },
        },
      )
    if (path === '/login') return next()
    if (
      request.method === 'GET' &&
      request.headers.get('accept')?.includes('text/html') &&
      !path.startsWith('/api/')
    ) {
      return new Response(null, {
        status: 303,
        headers: { Location: '/login', 'Cache-Control': 'no-store' },
      })
    }
    return Response.json(
      { error: 'Authentication required' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  const expectedOwner = request.headers.get('x-roastbook-owner')
  if (expectedOwner && expectedOwner !== identity.id)
    return Response.json(
      { error: 'Sign in to the original account to sync' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    !identity.integration
  ) {
    const origin = request.headers.get('origin')
    if (origin && origin !== requestOrigin(request, getServerEnv().PUBLIC_URL))
      return new Response('Forbidden', { status: 403 })
    if (request.headers.get('sec-fetch-site') === 'cross-site')
      return new Response('Forbidden', { status: 403 })
  }
  const tryRequest = isApiTryPath(path)
  if (tryRequest && request.headers.get(API_TRY_HEADER) !== '1')
    return Response.json(
      {
        error: { code: 'unauthorized', message: 'Use the API reference page' },
      },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    )
  const response = await withJournalResponse(
    tryRequest ? asReferenceSession(identity) : identity,
    next,
    { signal: request.signal },
  )
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'private, no-store')
  headers.set(
    'Vary',
    [headers.get('Vary'), 'Cookie', 'Authorization'].filter(Boolean).join(', '),
  )
  headers.set('X-Roastbook-Owner', identity.id)
  headers.set('Referrer-Policy', 'same-origin')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
