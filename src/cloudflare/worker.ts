import type {
  ExecutionContext,
  ScheduledController,
} from '@cloudflare/workers-types'
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
    _context: ExecutionContext,
  ): Promise<Response> {
    try {
      const canonical = canonicalRequest(request, bindings)
      if (canonical instanceof Response) return secureResponse(canonical)
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
  async scheduled(
    _event: ScheduledController,
    bindings: CloudflareRuntimeBindings,
    context: ExecutionContext,
  ): Promise<void> {
    context.waitUntil(
      withCloudflareRuntime(bindings, async () => {
        const { runScheduledJobs } = await import('./jobs.server')
        await runScheduledJobs()
      }),
    )
  },
}

export { OAuthCoordinator } from './oauth-coordinator'
