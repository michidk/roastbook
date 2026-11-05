import { CONSENT_BACKEND_URL } from './legal'

export type Geolocation = { country?: string; regionCode?: string }

/** First-party proxy so browsers never contact the consent backend's host. */
export async function proxyConsent(request: Request, cf?: Geolocation) {
  const url = new URL(request.url)
  if (!url.pathname.startsWith('/consent/'))
    return new Response('Not found', { status: 404 })
  const base = new URL(`${CONSENT_BACKEND_URL}/`)
  const target = new URL(
    url.pathname.slice('/consent/'.length) + url.search,
    base,
  )
  // `..` would otherwise reach another site on the shared backend.
  if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname))
    return new Response('Not found', { status: 404 })
  const headers = new Headers()
  for (const name of ['content-type', 'accept', 'accept-language', 'origin'])
    if (request.headers.has(name))
      headers.set(name, request.headers.get(name) as string)
  // Jurisdiction comes from Cloudflare's geolocation, never from the browser.
  // Workers cannot send the reserved CF-IPCountry; the backend's ingress maps this.
  if (cf?.country) headers.set('x-visitor-country', cf.country)
  if (cf?.regionCode)
    headers.set('cf-region-code', cf.regionCode)
  // Never forward app cookies or the client IP to the consent backend.
  return fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  })
}
