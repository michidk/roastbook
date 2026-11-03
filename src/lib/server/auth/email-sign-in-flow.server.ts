import '@tanstack/react-start/server-only'
import { AsyncLocalStorage } from 'node:async_hooks'
import { verifyOAuthQueryParams } from '@better-auth/oauth-provider'
import { z } from 'zod'
import { getServerEnv } from '@/lib/env.server'
import { readBoundedRequestBody } from '../request-body.server'

const flow = new AsyncLocalStorage<string | undefined>()
const continuation = z.object({
  oauth_query: z.string().max(16_384).optional(),
})

export function getEmailSignInOAuthQuery() {
  return flow.getStore()
}

export async function handleEmailSignInRequest(
  request: Request,
  next: (request: Request) => Promise<Response>,
) {
  const body = await readBoundedRequestBody(request, 65_536)
  if (body instanceof Response) return body
  let input: unknown
  try {
    input = JSON.parse(body.toString())
  } catch {
    return new Response('Invalid request', { status: 400 })
  }
  const parsed = continuation.safeParse(input)
  if (!parsed.success) return new Response('Invalid request', { status: 400 })
  const query = parsed.data.oauth_query
  if (
    query !== undefined &&
    !(await verifyOAuthQueryParams(query, getServerEnv().AUTH_SECRET ?? ''))
  )
    return new Response('Invalid OAuth continuation', { status: 400 })
  // Keep the original signed continuation across OTP schema parsing. Request
  // scope prevents concurrent email flows from inheriting each other's query.
  return flow.run(query, () =>
    next(
      new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body,
        signal: request.signal,
      }),
    ),
  )
}
