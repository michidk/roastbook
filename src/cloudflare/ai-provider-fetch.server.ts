import '@tanstack/react-start/server-only'
import { isIP } from 'node:net'
import { getServerEnv } from '@/lib/env.server'
import {
  isPrivateAddress,
  type ResolvedAddress,
  type ResolveHost,
} from '@/lib/server/remote-url-policy.server'
import {
  fetchPublicResource,
  limitResponseBody,
  resolvePublicHost,
} from './public-fetch.server'

const MAX_RESPONSE_BYTES = 8 * 1024 * 1024
const resolveHost: ResolveHost = resolvePublicHost

export function normalizeAiEndpoint(value: string) {
  const url = new URL(value)
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      'Use an HTTP(S) API base URL without credentials, query parameters, or a fragment',
    )
  url.pathname = url.pathname.replace(/\/+$/, '')
  return url.href.replace(/\/$/, '')
}

type EndpointPolicy =
  | {
      deploymentMode: 'hosted' | 'self-hosted'
      privateOrigins: readonly string[]
    }
  | { providedBaseURL: string }
type TransportOptions = { resolve?: ResolveHost; policy?: EndpointPolicy }
function endpointPolicy(): EndpointPolicy {
  const env = getServerEnv()
  return {
    deploymentMode: env.DEPLOYMENT_MODE,
    privateOrigins:
      env.AI_ALLOWED_PRIVATE_ORIGINS?.split(',').map((origin) =>
        origin.trim(),
      ) ?? [],
  }
}
export async function resolveAiEndpoint(
  value: string,
  { resolve = resolveHost, policy = endpointPolicy() }: TransportOptions = {},
) {
  const url = new URL(normalizeAiEndpoint(value))
  const privateAllowed =
    'providedBaseURL' in policy
      ? false
      : policy.deploymentMode === 'self-hosted' &&
        policy.privateOrigins.includes(url.origin)
  if (url.protocol !== 'https:' && !privateAllowed)
    throw new Error('AI endpoints must use HTTPS')
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  let addresses: readonly ResolvedAddress[]
  try {
    addresses = isIP(hostname)
      ? [{ address: hostname }]
      : await resolve(hostname)
  } catch {
    throw new Error('Could not resolve the AI provider')
  }
  if (
    !addresses.length ||
    addresses.some(({ address }) => {
      if (!isIP(address)) return true
      if (privateAllowed) return false
      if (isPrivateAddress(address)) return true
      // Exclude translation/tunnel and non-global IPv6 ranges as well as private IPs.
      return (
        isIP(address) === 6 &&
        (!/^[23][0-9a-f]{3}:/i.test(address) ||
          /^2002:|^2001:0{0,4}:/i.test(address))
      )
    })
  )
    throw new Error('That AI endpoint is not allowed. Use a public provider.')
  return { url, addresses }
}

export function createProvidedAiFetch(): typeof fetch {
  const env = getServerEnv()
  if (!env.AUTH_ENABLED || !env.AI_PROVIDED_API_KEY)
    throw new Error('Provided AI is unavailable')
  return createAiProviderFetch(env.AI_PROVIDED_BASE_URL)
}
export function createAiProviderFetch(
  baseURL: string,
  options: TransportOptions = {},
): typeof fetch {
  const endpoint = normalizeAiEndpoint(baseURL)
  const providerFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const request = new Request(input, init)
    if (
      request.method !== 'POST' ||
      ![`${endpoint}/responses`, `${endpoint}/chat/completions`].includes(
        request.url,
      )
    )
      throw new Error('Unexpected AI provider request')
    const resolved = await resolveAiEndpoint(endpoint, options)
    const target = new URL(request.url)
    if (target.origin !== resolved.url.origin)
      throw new Error('Unexpected AI provider request')
    const headers = new Headers()
    for (const name of ['authorization', 'content-type', 'accept']) {
      const value = request.headers.get(name)
      if (value) headers.set(name, value)
    }
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(120_000),
    ])
    let response: Response
    try {
      response = await fetchPublicResource(request.url, {
        method: 'POST',
        headers,
        body: request.body
          ? limitResponseBody(
              request.body,
              64 * 1024 * 1024,
              'AI request is too large',
            )
          : null,
        signal,
      })
    } catch {
      throw new Error('Could not reach the AI provider')
    }
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(
        response.status === 401 || response.status === 403
          ? 'AI provider rejected your API key'
          : `AI provider request failed (${response.status})`,
      )
    }
    return new Response(
      response.body
        ? limitResponseBody(
            response.body,
            MAX_RESPONSE_BYTES,
            'Could not read the AI provider response',
          )
        : null,
      {
        status: response.status,
        headers: {
          'Content-Type':
            response.headers.get('content-type') ?? 'application/json',
        },
      },
    )
  }
  return Object.assign(providerFetch, { preconnect: fetch.preconnect })
}
