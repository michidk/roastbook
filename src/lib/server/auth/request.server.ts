import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import type { JournalIdentity } from '@/db/journal-context.server'
import { withJournalResponse } from '@/db/journal-response.server'
import { authUsers, integrationTokens } from '@/db/schema'
import { DEMO_MODE } from '@/lib/build-mode'
import { getServerEnv } from '@/lib/env.server'
import { requestOrigin } from '@/lib/request-origin'
import {
  defaultIdentity,
  initializeUser,
} from '@/lib/server/auth/identity.server'
import { validateMcpRequest } from '../mcp/http-policy.server'
import { getAuth } from './auth.server'
import { handleAuthRequest } from './http.server'
import { authorizeMcpRequest } from './mcp-authorization.server'

export function hashIntegrationToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
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
  const integration =
    path === '/api/mcp'
      ? 'mcp'
      : path.startsWith('/api/shottimer/')
        ? 'shottimer'
        : null
  const env = getServerEnv()
  if (integration) {
    const token = /^Bearer ([A-Za-z0-9_-]{32,200})$/i.exec(
      request.headers.get('authorization') ?? '',
    )?.[1]
    if (!token) return null
    const [match] = await getControlDb()
      .select({ user: authUsers })
      .from(integrationTokens)
      .innerJoin(authUsers, eq(integrationTokens.userId, authUsers.id))
      .where(
        and(
          eq(integrationTokens.tokenHash, hashIntegrationToken(token)),
          eq(integrationTokens.kind, integration),
          gt(integrationTokens.expiresAt, new Date()),
          isNull(authUsers.deletingAt),
        ),
      )
      .limit(1)
    if (!match) return null
    return {
      id: match.user.id,
      email: match.user.email,
      role: match.user.role,
      authentication: env.AUTH_ENABLED,
      authenticatedAt: null,
      ...(integration === 'mcp'
        ? { mcpScopes: ['mcp:read', 'mcp:write'] }
        : {}),
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
  return {
    id: session.user.id,
    email: session.user.email,
    role: current?.role === 'admin' ? 'admin' : 'user',
    authentication: true,
    authenticatedAt: session.session.createdAt,
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

async function handlePrivateRequest(
  request: Request,
  next: () => Promise<Response>,
  identity: JournalIdentity | null,
) {
  const path = new URL(request.url).pathname
  if (!identity) {
    if (path === '/api/mcp') return authorizeMcpRequest(request, next)
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
    path !== '/api/mcp' &&
    !path.startsWith('/api/shottimer/')
  ) {
    const origin = request.headers.get('origin')
    if (origin && origin !== requestOrigin(request, getServerEnv().AUTH_URL))
      return new Response('Forbidden', { status: 403 })
    if (request.headers.get('sec-fetch-site') === 'cross-site')
      return new Response('Forbidden', { status: 403 })
  }
  const response = await withJournalResponse(identity, next, {
    signal: request.signal,
  })
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
