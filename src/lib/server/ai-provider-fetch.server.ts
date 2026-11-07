import '@tanstack/react-start/server-only'
import { lookup } from 'node:dns/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'
import { getServerEnv } from '@/lib/env.server'
import {
  isPrivateAddress,
  type ResolvedAddress,
  type ResolveHost,
} from './remote-url-policy.server'

export class AiProviderRequestError extends Error {
  constructor(readonly status: number) {
    super(
      status === 401 || status === 403
        ? 'AI provider rejected your API key. Check Settings > AI.'
        : status === 429
          ? 'AI provider rate limit reached. Please try again later.'
          : status >= 500
            ? 'AI provider is temporarily unavailable. Please try again later.'
            : `AI provider request failed (${status}). Check the API format and model in Settings > AI.`,
    )
  }
}

const MAX_RESPONSE_BYTES = 8 * 1024 * 1024
const resolveHost: ResolveHost = (hostname) => lookup(hostname, { all: true })

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

type EndpointPolicy = {
  deploymentMode: 'hosted' | 'self-hosted'
  privateOrigins: readonly string[]
}
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
    policy.deploymentMode === 'self-hosted' &&
    policy.privateOrigins.includes(url.origin)
  if (url.protocol !== 'https:' && !privateAllowed)
    throw new Error(
      policy.deploymentMode === 'self-hosted'
        ? 'HTTP AI endpoints require the administrator to add the exact origin (scheme, hostname, and port, without a path) to AI_ALLOWED_PRIVATE_ORIGINS and recreate the application container'
        : 'AI endpoints must use HTTPS',
    )
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

/** Resolve on every request, then pin the approved IP while preserving TLS hostname verification. */
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
    const target = new URL(request.url)
    if (
      request.method !== 'POST' ||
      ![
        `${endpoint}/responses`,
        `${endpoint}/chat/completions`,
        `${endpoint}/images/edits`,
      ].includes(target.href)
    )
      throw new Error('Unexpected AI provider request')
    const { addresses } = await resolveAiEndpoint(endpoint, options)
    // Materialize multipart boundaries before consuming Bun's lazy request body.
    const headers = Object.fromEntries(
      [...request.headers].filter(([name]) =>
        ['authorization', 'content-type', 'accept'].includes(name),
      ),
    )
    const body = Buffer.from(await request.arrayBuffer())
    if (body.byteLength > 64 * 1024 * 1024)
      throw new Error('AI request is too large')
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(120_000),
    ])
    return new Promise<Response>((resolve, reject) => {
      const records = addresses.map(({ address }) => ({
        address,
        family: isIP(address),
      }))
      const outgoing = (
        target.protocol === 'https:' ? httpsRequest : httpRequest
      )(
        target,
        {
          method: 'POST',
          agent: false,
          headers,
          maxHeaderSize: 16_384,
          lookup: (_hostname, options, callback) => {
            const family =
              typeof options === 'number' ? options : options.family
            const eligible = family
              ? records.filter((record) => record.family === family)
              : records
            const selected = eligible[0]
            if (!selected)
              return callback(
                new Error('AI provider address is unavailable'),
                '',
                0,
              )
            if (typeof options !== 'number' && options.all)
              return callback(null, eligible)
            callback(null, selected.address, selected.family)
          },
          signal,
        },
        (incoming) => {
          const status = incoming.statusCode ?? 502
          if (status < 200 || status >= 300) {
            incoming.destroy()
            // Never forward redirects, provider error bodies, headers, or reflected keys.
            reject(new AiProviderRequestError(status))
            return
          }
          const chunks = incoming[Symbol.asyncIterator]()
          let size = 0
          resolve(
            new Response(
              new ReadableStream<Uint8Array>({
                async pull(controller) {
                  try {
                    const chunk = await chunks.next()
                    if (chunk.done) return controller.close()
                    size += chunk.value.byteLength
                    if (
                      size >
                      (target.href === `${endpoint}/images/edits`
                        ? 24 * 1024 * 1024
                        : MAX_RESPONSE_BYTES)
                    )
                      throw new Error('AI response is too large')
                    controller.enqueue(new Uint8Array(chunk.value))
                  } catch {
                    incoming.destroy()
                    controller.error(
                      new Error('Could not read the AI provider response'),
                    )
                  }
                },
                cancel() {
                  incoming.destroy()
                },
              }),
              {
                status,
                headers: {
                  'Content-Type':
                    incoming.headers['content-type'] ?? 'application/json',
                },
              },
            ),
          )
        },
      )
      outgoing.once('error', () =>
        reject(new Error('Could not reach the AI provider')),
      )
      outgoing.end(body)
    })
  }
  return Object.assign(providerFetch, { preconnect: fetch.preconnect })
}
