import type { DurableObjectState } from '@cloudflare/workers-types'
import {
  type CloudflareRuntimeBindings,
  withCloudflareRuntime,
} from './context.server'

/** Alarms give account jobs the Durable Object CPU budget on Workers Free. */
export class AccountJobs {
  constructor(
    private readonly state: DurableObjectState,
    private readonly bindings: CloudflareRuntimeBindings,
  ) {}

  fetch(request: Request): Promise<Response> {
    return this.state.blockConcurrencyWhile(async () => {
      if (
        request.method !== 'POST' ||
        request.url !== 'https://account-jobs.internal/start'
      )
        return new Response('Not found', { status: 404 })
      if ((await this.state.storage.getAlarm()) === null)
        await this.state.storage.setAlarm(Date.now() + 60_000)
      return new Response(null, { status: 204 })
    })
  }

  async alarm(): Promise<void> {
    try {
      await withCloudflareRuntime(this.bindings, async () => {
        const { runScheduledJobs } = await import('./jobs.server')
        await runScheduledJobs()
      })
    } finally {
      await this.state.storage.setAlarm(Date.now() + 60_000)
    }
  }
}
