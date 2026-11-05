import '@tanstack/react-start/server-only'
import { resolvePublicHttpUrl } from '@/lib/server/remote-url-policy.server'
import { fetchPublicResource, limitResponseBody } from './public-fetch.server'

export async function fetchClientMetadataResource(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = new Request(input, init)
  const { url } = await resolvePublicHttpUrl(request.url)
  if (url.protocol !== 'https:' || !['GET', 'HEAD'].includes(request.method))
    throw new Error('CIMD transport requires public HTTPS GET or HEAD')
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(10000)])
  const headers = new Headers()
  for (const name of ['accept', 'if-none-match', 'if-modified-since']) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  const response = await fetchPublicResource(url, {
    method: request.method,
    headers,
    signal,
  })
  return new Response(
    response.body
      ? limitResponseBody(
          response.body,
          1024 * 1024,
          'Metadata response is too large',
        )
      : null,
    {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    },
  )
}
