import type { ExecutionContext } from '@cloudflare/workers-types'
import { getServerEnv } from '@/lib/env.server'
import app from '../server'
import {
  captureServerException,
  logEvent,
  observeMcpRequest,
  proxyAnalytics,
  recordRequestMetric,
} from './analytics.server'
import {
  type CloudflareRuntimeBindings,
  withCloudflareRuntime,
} from './context.server'
import type { Geolocation } from './consent.server'
import { canonicalRequest, secureResponse } from './http.server'

export default {
  async fetch(
    request: Request,
    bindings: CloudflareRuntimeBindings,
    context: ExecutionContext,
  ): Promise<Response> {
    try {
      // The public, data-free SPA shell is also rendered at build time, before
      // deployment bindings such as AUTH_URL are available.
      if (
        request.method === 'GET' &&
        /^\/offline-shell\/?$/.test(new URL(request.url).pathname)
      )
        return secureResponse(await app.fetch(request))
      const canonical = canonicalRequest(request, bindings)
      if (canonical instanceof Response) return secureResponse(canonical)
      if (new URL(canonical.url).pathname === '/api/health') {
        const jobs = bindings.ACCOUNT_JOBS.get(
          bindings.ACCOUNT_JOBS.idFromName('account-jobs'),
        )
        context.waitUntil(
          jobs
            .fetch('https://account-jobs.internal/start', { method: 'POST' })
            .then(async (response) => {
              await response.body?.cancel()
              if (!response.ok) throw new Error('Account job scheduling failed')
            }),
        )
      }
      return await withCloudflareRuntime(
        bindings,
        async () => {
        if (new URL(canonical.url).pathname.startsWith('/ingest/'))
          return secureResponse(await proxyAnalytics(canonical))
        if (new URL(canonical.url).pathname.startsWith('/consent/')) {
          const { proxyConsent } = await import('./consent.server')
          return secureResponse(
            await proxyConsent(
              canonical,
              (request as Request & { cf?: Geolocation }).cf,
            ),
          )
        }
        if (new URL(canonical.url).pathname.startsWith('/media/')) {
          const { handleCloudflareMedia } = await import('./media.server')
          return secureResponse(
            await handleCloudflareMedia(canonical),
            getServerEnv().ROASTBOOK_SOURCE_REVISION,
          )
        }
        const started = Date.now()
        const response =
          new URL(canonical.url).pathname === '/api/mcp'
            ? await observeMcpRequest(canonical, (mcp) => app.fetch(mcp))
            : await app.fetch(canonical)
        recordRequestMetric(canonical.method, response.status, Date.now() - started)
        return secureResponse(
          response,
          getServerEnv().ROASTBOOK_SOURCE_REVISION,
        )
        },
        {
          request: canonical,
          waitUntil: (promise) => context.waitUntil(promise),
        },
      )
    } catch (error) {
      withCloudflareRuntime(
        bindings,
        () => {
          logEvent('error', 'cloudflare_request_failed')
          captureServerException(error)
        },
        { waitUntil: (promise) => context.waitUntil(promise) },
      )
      return secureResponse(
        new Response('Service unavailable', { status: 503 }),
      )
    }
  },
}

export { AccountJobs } from './account-jobs'
export { OAuthCoordinator } from './oauth-coordinator'
