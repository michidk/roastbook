import {
  type CloudflareRuntimeBindings,
  withCloudflareRuntime,
} from '@/cloudflare/context.server'
import { verifyAccounts } from './verify-accounts'
import { verifyJournalCases } from './verify-journal'
import { verifyStatistics } from './verify-statistics'

const cases = [
  {
    name: 'hosted account, authentication and AI quota invariants',
    run: verifyAccounts,
  },
  ...verifyJournalCases,
  {
    name: 'localized statistics and percentiles across paginated scans',
    run: verifyStatistics,
  },
]

export default {
  async fetch(_request: Request, bindings: CloudflareRuntimeBindings) {
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
