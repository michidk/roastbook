import type { DurableObjectState } from '@cloudflare/workers-types'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { getAuth } from '@/lib/server/auth/auth.server'
import {
  assertControlChanges,
  runControlBatch,
} from './auth/control-batch.server'
import {
  type CloudflareRuntimeBindings,
  withCloudflareRuntime,
} from './context.server'

const revocation = z.object({
  clientId: z.string().min(1).max(2048),
  userId: z.string().min(1).max(256),
  id: z.string().min(1).max(256),
})

/** A client has one coordinator across isolates, including disconnect/reconnect. */
export class OAuthCoordinator {
  constructor(
    private readonly state: DurableObjectState,
    private readonly bindings: CloudflareRuntimeBindings,
  ) {}

  fetch(request: Request): Promise<Response> {
    return this.state.blockConcurrencyWhile(async () => {
      try {
        return await withCloudflareRuntime(this.bindings, async () => {
          const url = new URL(request.url)
          if (
            url.origin === 'https://oauth-coordinator.internal' &&
            url.pathname === '/revoke' &&
            request.method === 'POST'
          ) {
            const input = revocation.parse(await request.json())
            // The private binding caller checked the session and its freshness.
            // Re-check account and consent in the same batch as token deletion.
            await runControlBatch(
              [
                sql`delete from oauth_consent where id=${input.id} and user_id=${input.userId} and client_id=${input.clientId}
                and exists(select 1 from auth_users where id=${input.userId} and deleting_at is null)`,
                ...assertControlChanges(1),
                sql`delete from oauth_access_token where user_id=${input.userId} and client_id=${input.clientId}`,
                sql`delete from oauth_refresh_token where user_id=${input.userId} and client_id=${input.clientId}`,
              ],
              'Application connection not found',
            )
            return new Response(null, { status: 204 })
          }
          if (
            url.origin !== this.bindings.AUTH_URL ||
            url.pathname !== '/api/auth/oauth2/token' ||
            request.method !== 'POST'
          )
            return new Response('Not found', { status: 404 })
          // The gate covers every awaited provider read/write. A failed request
          // cannot leave a timed lease that another isolate can outlive.
          return await getAuth().handler(request)
        })
      } catch {
        return Response.json(
          { error: 'temporarily_unavailable' },
          {
            status: 503,
            headers: { 'Cache-Control': 'no-store', 'Retry-After': '1' },
          },
        )
      }
    })
  }
}
