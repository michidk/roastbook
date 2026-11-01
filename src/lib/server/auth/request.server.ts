import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import type { JournalIdentity } from '@/db/journal-context.server'
import { withJournalResponse } from '@/db/journal-response.server'
import { authUsers, integrationTokens } from '@/db/schema'
import { DEMO_MODE } from '@/lib/build-mode'
import { getServerEnv } from '@/lib/env.server'
import { getAuth } from './auth.server'
import { defaultIdentity, initializeUser } from './identity.server'

export function hashIntegrationToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function resolveIdentity(
  request: Request,
): Promise<JournalIdentity | null> {
  if (DEMO_MODE)
    return {
      id: 'local',
      name: 'Demo',
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
      name: match.user.name,
      email: match.user.email,
      role: match.user.role,
      authentication: env.AUTH_ENABLED,
      authenticatedAt: null,
    }
  }
  if (!env.AUTH_ENABLED) return defaultIdentity()
  const session = await getAuth().api.getSession({ headers: request.headers })
  if (!session || session.user.deletingAt || !session.user.emailVerified)
    return null
  await initializeUser(session.user)
  const [current] = await getControlDb()
    .select({ role: authUsers.role })
    .from(authUsers)
    .where(eq(authUsers.id, session.user.id))
  return {
    id: session.user.id,
    name: session.user.name,
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
  if (path === '/api/health') return next()
  if (path.startsWith('/api/auth/')) {
    if (!getServerEnv().AUTH_ENABLED)
      return new Response('Not found', { status: 404 })
    const endpoint = path.slice('/api/auth'.length)
    const allowed = new Set([
      '/ok',
      '/get-session',
      '/sign-out',
      '/email-otp/send-verification-otp',
      '/sign-in/email-otp',
      '/update-user',
      '/change-email',
      '/verify-email',
      '/send-verification-email',
      '/list-sessions',
      '/revoke-session',
      '/revoke-sessions',
      '/revoke-other-sessions',
      '/passkey/generate-register-options',
      '/passkey/verify-registration',
      '/passkey/generate-authenticate-options',
      '/passkey/verify-authentication',
      '/passkey/list-user-passkeys',
      '/passkey/delete-passkey',
      '/passkey/update-passkey',
    ])
    if (!allowed.has(endpoint))
      return new Response('Not found', { status: 404 })
    const response = await getAuth().handler(request)
    const headers = new Headers(response.headers)
    headers.set('Cache-Control', 'private, no-store')
    headers.set('Referrer-Policy', 'no-referrer')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.append('Vary', 'Cookie, Origin')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
  const identity = await resolveIdentity(request)
  if (!identity) {
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
    if (
      origin &&
      origin !== new URL(getServerEnv().AUTH_URL ?? request.url).origin
    )
      return new Response('Forbidden', { status: 403 })
    if (request.headers.get('sec-fetch-site') === 'cross-site')
      return new Response('Forbidden', { status: 403 })
  }
  const response = await withJournalResponse(identity, next)
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
