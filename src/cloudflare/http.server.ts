import type { CloudflareRuntimeBindings } from './context.server'

export function canonicalRequest(
  request: Request,
  bindings: Pick<CloudflareRuntimeBindings, 'AUTH_URL'>,
): Request | Response {
  const configured = new URL(bindings.AUTH_URL)
  const url = new URL(request.url)
  if (
    configured.protocol !== 'https:' ||
    configured.origin !== bindings.AUTH_URL ||
    url.origin !== configured.origin
  )
    return new Response('Misdirected request', { status: 421 })
  const headers = new Headers(request.headers)
  for (const name of [
    'forwarded',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-real-ip',
  ])
    headers.delete(name)
  const clientIp = request.headers.get('cf-connecting-ip')
  if (clientIp) headers.set('x-real-ip', clientIp)
  return new Request(request, { headers })
}
export function secureResponse(
  response: Response,
  revision?: string,
): Response {
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'private, no-store')
  headers.set('X-Content-Type-Options', 'nosniff')
  if (!headers.has('Referrer-Policy'))
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  if (revision) headers.set('X-Roastbook-Revision', revision)
  headers.set('Strict-Transport-Security', 'max-age=31536000')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
