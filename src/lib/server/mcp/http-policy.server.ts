import '@tanstack/react-start/server-only'
import {
  hostHeaderValidationResponse,
  originValidationResponse,
} from '@modelcontextprotocol/server'
import { readBoundedRequestBody } from '../request-body.server'
import { getMcpConfig } from './config.server'

export async function validateMcpRequest(request: Request) {
  const config = getMcpConfig()
  const rejected =
    hostHeaderValidationResponse(request, config.allowedHostnames) ??
    originValidationResponse(request, config.allowedOrigins)
  if (rejected) return rejected
  if (request.method !== 'POST')
    return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  if (
    request.headers
      .get('content-type')
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase() !== 'application/json'
  )
    return new Response('Use application/json', { status: 415 })
  const body = await readBoundedRequestBody(request.clone(), 1024 * 1024)
  if (body instanceof Response) {
    void request.body?.cancel().catch(() => undefined)
    return body
  }
  return null
}
