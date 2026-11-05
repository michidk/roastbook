import {
  type CloudflareRuntimeBindings,
  withCloudflareRuntime,
} from '@/cloudflare/context.server'
import { verifyAccounts } from './verify-accounts'
import { verifyAuthentication } from './verify-auth'
import { verifyImageStorage } from './verify-image-storage'
import { verifyJournalCases } from './verify-journal'
import { verifyJournalSync } from './verify-journal-sync'
import { verifyStatistics } from './verify-statistics'

const cases = [
  { name: 'shared authentication contract on D1', run: verifyAuthentication },
  {
    name: 'hosted account, authentication and AI quota invariants',
    run: verifyAccounts,
  },
  ...verifyJournalCases,
  {
    name: 'browser writes replay on D1 once, with recorded identifiers',
    run: verifyJournalSync,
  },
  {
    name: 'atomic image limits, compressed storage, legacy measurement and owner isolation',
    run: verifyImageStorage,
  },
  {
    name: 'localized statistics and percentiles across paginated scans',
    run: verifyStatistics,
  },
]

export default {
  async fetch(request: Request, bindings: CloudflareRuntimeBindings) {
    // Miniflare probes the worker on startup; running the suite for that request
    // too would race two copies against the same database.
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/verify')
      return new Response(null, { status: 404 })
    return withCloudflareRuntime(bindings, async () => {
      const results = []
      for (const item of cases) {
        const start = Date.now()
        try {
          await item.run(bindings)
          results.push({
            name: item.name,
            passed: true,
            durationMs: Date.now() - start,
          })
        } catch (error) {
          results.push({
            name: item.name,
            passed: false,
            durationMs: Date.now() - start,
            error: error instanceof Error ? error.stack : String(error),
          })
        }
      }
      const passed = results.every((result) => result.passed)
      return Response.json({ passed, results }, { status: passed ? 200 : 500 })
    })
  },
}
