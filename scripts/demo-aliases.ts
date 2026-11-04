import { resolve } from 'node:path'

// Server-function modules are replaced by `demoServices()`. These HTTP handlers
// and the auth client have other shapes, so they keep explicit replacements.
const api = resolve('packages/journal-demo/src/api.ts')
export const demoServiceAliases = [
  { find: '@/lib/server/shottimer-api', replacement: api },
  { find: '@/lib/server/account-export', replacement: api },
  { find: '@/lib/server/replication', replacement: api },
  {
    find: '@/lib/auth-client',
    replacement: resolve('packages/journal-demo/src/auth-client.ts'),
  },
]
