import '@tanstack/react-start/server-only'
import { decodeBasicCredentials } from 'better-auth/oauth2'
import { coordinateTokenRequest } from '@/lib/server/auth/oauth-coordination.server'
import { readBoundedRequestBody } from '../request-body.server'
import { getAuth } from './auth.server'

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
    ? coordinateTokenRequest(clientId, buffered)
    : getAuth().handler(buffered)
}
