import '@tanstack/react-start/server-only'
import { getServerEnv } from '@/lib/env.server'
import { getAuth } from './auth.server'
import { handleEmailSignInRequest } from './email-sign-in-flow.server'
import { OAUTH_DISCOVERY_PATHS } from './mcp-authorization.server'
import { handleOAuthTokenRequest } from './oauth-token.server'

const allowed = new Set([
  '/ok',
  '/oauth2/authorize',
  '/oauth2/token',
  '/oauth2/register',
  '/oauth2/revoke',
  '/oauth2/continue',
  '/oauth2/public-client',
  '/jwks',
  '/get-session',
  '/sign-out',
  '/email-otp/send-verification-otp',
  '/email-otp/resolve-sign-in-link',
  '/email-otp/check-verification-otp',
  '/sign-in/email-otp',
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

export async function handleAuthRequest(
  request: Request,
): Promise<Response | null> {
  const path = new URL(request.url).pathname
  const discovery = OAUTH_DISCOVERY_PATHS.has(path)
  if (!discovery && !path.startsWith('/api/auth/')) return null
  if (!getServerEnv().AUTH_ENABLED)
    return new Response('Not found', { status: 404 })
  const endpoint = path.slice('/api/auth'.length)
  if (!discovery && !allowed.has(endpoint))
    return new Response('Not found', { status: 404 })
  const response = await (endpoint === '/oauth2/token'
    ? handleOAuthTokenRequest(request)
    : endpoint === '/email-otp/send-verification-otp' &&
        request.method === 'POST'
      ? handleEmailSignInRequest(request, (buffered) =>
          getAuth().handler(buffered),
        )
      : getAuth().handler(request))
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
