import '@tanstack/react-start/server-only'
import { decodeBasicCredentials } from 'better-auth/oauth2'
import { readBoundedRequestBody } from '../request-body.server'
import { getAuth } from './auth.server'
import { OAuthClientBusyError, withOAuthClientLock } from './oauth-lock.server'

export async function handleOAuthTokenRequest(request: Request) {
  const body = await readBoundedRequestBody(request, 65_536)
  if (body instanceof Response) return body
  const buffered = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
  })
  const params = new URLSearchParams(body.toString())
  let clientId = params.get('client_id')
  const authorization = request.headers.get('authorization')
  if (authorization?.toLowerCase().startsWith('basic ')) {
    try {
      clientId = decodeBasicCredentials(authorization).clientId
    } catch {
      return getAuth().handler(buffered)
    }
  }
  // Credential and grant validation remain the provider's responsibility.
  // Holding this lock across the complete exchange prevents a refresh from
  // surviving a concurrent disconnect and then attaching to a new consent.
  return clientId
    ? withOAuthClientLock(clientId, () => getAuth().handler(buffered)).catch(
        (error: unknown) => {
          if (!(error instanceof OAuthClientBusyError)) throw error
          return Response.json(
            { error: 'temporarily_unavailable' },
            {
              status: 429,
              headers: { 'Retry-After': '1', 'Cache-Control': 'no-store' },
            },
          )
        },
      )
    : getAuth().handler(buffered)
}
