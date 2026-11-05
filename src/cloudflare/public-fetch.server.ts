import '@tanstack/react-start/server-only'
import { isIP } from 'node:net'
import { z } from 'zod'
import { isPrivateAddress } from '@/lib/server/public-ip'

const dnsResponse = z.object({
  Status: z.number().int(),
  Answer: z
    .array(z.object({ type: z.number().int(), data: z.string() }))
    .optional(),
})
/** Defense in depth. Final DNS destination safety is enforced by Workers' public outbound network. */
export async function resolvePublicHost(hostname: string) {
  const signal = AbortSignal.timeout(5000)
  const answers = await Promise.all(
    ['A', 'AAAA'].map(async (type) => {
      const url = new URL('https://cloudflare-dns.com/dns-query')
      url.search = new URLSearchParams({ name: hostname, type }).toString()
      const response = await fetch(url, {
        headers: { Accept: 'application/dns-json' },
        redirect: 'error',
        signal,
      })
      if (!response.ok) throw new Error('Could not resolve public host')
      const result = dnsResponse.parse(await response.json())
      if (result.Status !== 0 && result.Status !== 3)
        throw new Error('Could not resolve public host')
      return (result.Answer ?? [])
        .filter((answer) => answer.type === 1 || answer.type === 28)
        .map((answer) => ({ address: answer.data, family: isIP(answer.data) }))
    }),
  )
  const addresses = answers.flat()
  if (
    !addresses.length ||
    addresses.some(({ address }) => isPrivateAddress(address))
  )
    throw new Error('Host is not publicly routable')
  return addresses
}

/** Native fetch must use global_fetch_strictly_public and no origin/VPC bypass binding. */
export async function fetchPublicResource(
  input: string | URL,
  init: RequestInit,
): Promise<Response> {
  const url = new URL(input)
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    (isIP(hostname) && isPrivateAddress(hostname))
  )
    throw new Error('URL is not publicly routable')
  const response = await fetch(url, {
    ...init,
    redirect: 'manual',
    credentials: 'omit',
  })
  const headerBytes = Array.from(response.headers).reduce(
    (size, [name, value]) => size + name.length + value.length + 4,
    0,
  )
  if (headerBytes > 16384) {
    await response.body?.cancel()
    throw new Error('Remote response headers are too large')
  }
  return response
}
export function limitResponseBody(
  body: ReadableStream<Uint8Array>,
  limit: number,
  message: string,
): ReadableStream<Uint8Array> {
  const reader = body.getReader()
  let size = 0
  return new ReadableStream(
    {
      async pull(controller) {
        try {
          const chunk = await reader.read()
          if (chunk.done) {
            reader.releaseLock()
            controller.close()
            return
          }
          size += chunk.value.byteLength
          if (size > limit) throw new Error(message)
          controller.enqueue(chunk.value)
        } catch {
          await reader.cancel().catch(() => undefined)
          reader.releaseLock()
          controller.error(new Error(message))
        }
      },
      async cancel() {
        await reader.cancel()
        reader.releaseLock()
      },
    },
    { highWaterMark: 0 },
  )
}
