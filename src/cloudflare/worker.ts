import type { ExecutionContext } from '@cloudflare/workers-types'
import { getServerEnv } from '@/lib/env.server'
import app from '../server'
import {
  type CloudflareRuntimeBindings,
  withCloudflareRuntime,
} from './context.server'
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
      return await withCloudflareRuntime(bindings, async () => {
        if (new URL(canonical.url).pathname.startsWith('/media/')) {
          const { handleCloudflareMedia } = await import('./media.server')
          return secureResponse(
            await handleCloudflareMedia(canonical),
            getServerEnv().ROASTBOOK_SOURCE_REVISION,
          )
        }
        return secureResponse(
          await app.fetch(canonical),
          getServerEnv().ROASTBOOK_SOURCE_REVISION,
        )
      })
    } catch {
      console.error(JSON.stringify({ event: 'cloudflare_request_failed' }))
      return secureResponse(
        new Response('Service unavailable', { status: 503 }),
      )
    }
  },
}

export { AccountJobs } from './account-jobs'
export { OAuthCoordinator } from './oauth-coordinator'
