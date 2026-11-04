import { resolve } from 'node:path'

// Edition entry points are ordinary modules. No server code is compiled for the browser demo.
export const demoServiceAliases = [
  {
    find: '@/lib/server/brewing-methods',
    replacement: resolve(
      'packages/journal-demo/src/services/brewing-methods.ts',
    ),
  },
  {
    find: '@/lib/server/app-settings',
    replacement: resolve('packages/journal-demo/src/services/app-settings.ts'),
  },
  {
    find: '@/lib/server/cafe-visits',
    replacement: resolve('packages/journal-demo/src/services/cafe-visits.ts'),
  },
  {
    find: '@/lib/server/coffee-shops',
    replacement: resolve('packages/journal-demo/src/services/coffee-shops.ts'),
  },
  {
    find: '@/lib/server/passkey-prompt',
    replacement: resolve(
      'packages/journal-demo/src/services/passkey-prompt.ts',
    ),
  },
  {
    find: '@/lib/server/ai-provider-settings',
    replacement: resolve(
      'packages/journal-demo/src/services/ai-provider-settings.ts',
    ),
  },
  {
    find: '@/lib/server/taste-tags',
    replacement: resolve('packages/journal-demo/src/services/taste-tags.ts'),
  },
  {
    find: '@/lib/server/ai-request-logs',
    replacement: resolve(
      'packages/journal-demo/src/services/ai-request-logs.ts',
    ),
  },
  {
    find: '@/lib/server/stats',
    replacement: resolve('packages/journal-demo/src/services/stats.ts'),
  },
  {
    find: '@/lib/server/recipes',
    replacement: resolve('packages/journal-demo/src/services/recipes.ts'),
  },
  {
    find: '@/lib/server/images',
    replacement: resolve('packages/journal-demo/src/services/images.ts'),
  },
  {
    find: '@/lib/server/journal-sync',
    replacement: resolve('packages/journal-demo/src/services/journal-sync.ts'),
  },
  {
    find: '@/lib/server/admin-ai',
    replacement: resolve('packages/journal-demo/src/services/admin-ai.ts'),
  },
  {
    find: '@/lib/server/shottimer',
    replacement: resolve('packages/journal-demo/src/services/shottimer.ts'),
  },
  {
    find: '@/lib/server/settings',
    replacement: resolve('packages/journal-demo/src/services/settings.ts'),
  },
  {
    find: '@/lib/server/remote-image',
    replacement: resolve('packages/journal-demo/src/services/remote-image.ts'),
  },
  {
    find: '@/lib/server/oauth',
    replacement: resolve('packages/journal-demo/src/services/oauth.ts'),
  },
  {
    find: '@/lib/server/command-search',
    replacement: resolve(
      'packages/journal-demo/src/services/command-search.ts',
    ),
  },
  {
    find: '@/lib/server/beans',
    replacement: resolve('packages/journal-demo/src/services/beans.ts'),
  },
  {
    find: '@/lib/server/shots',
    replacement: resolve('packages/journal-demo/src/services/shots.ts'),
  },
  {
    find: '@/lib/server/shot-recommendations',
    replacement: resolve(
      'packages/journal-demo/src/services/shot-recommendations.ts',
    ),
  },
  {
    find: '@/lib/server/internal-stats',
    replacement: resolve(
      'packages/journal-demo/src/services/internal-stats.ts',
    ),
  },
  {
    find: '@/lib/server/geocoding',
    replacement: resolve('packages/journal-demo/src/services/geocoding.ts'),
  },
  {
    find: '@/lib/server/gear',
    replacement: resolve('packages/journal-demo/src/services/gear.ts'),
  },
  {
    find: '@/lib/server/gear-sets',
    replacement: resolve('packages/journal-demo/src/services/gear-sets.ts'),
  },
  {
    find: '@/lib/server/bean-purchases',
    replacement: resolve(
      'packages/journal-demo/src/services/bean-purchases.ts',
    ),
  },
  {
    find: '@/lib/server/drink-options',
    replacement: resolve('packages/journal-demo/src/services/drink-options.ts'),
  },
  {
    find: '@/lib/server/account',
    replacement: resolve('packages/journal-demo/src/services/account.ts'),
  },
  {
    find: '@/lib/server/roasters',
    replacement: resolve('packages/journal-demo/src/services/roasters.ts'),
  },
  {
    find: '@/lib/server/suggestions',
    replacement: resolve('packages/journal-demo/src/services/suggestions.ts'),
  },
  {
    find: '@/lib/mcp/settings',
    replacement: resolve('packages/journal-demo/src/services/mcp-settings.ts'),
  },
  {
    find: '@/lib/server/shottimer-api',
    replacement: resolve('packages/journal-demo/src/services/api.ts'),
  },
  {
    find: '@/lib/server/account-export',
    replacement: resolve('packages/journal-demo/src/services/api.ts'),
  },
  {
    find: '@/lib/server/replication',
    replacement: resolve('packages/journal-demo/src/services/api.ts'),
  },
  {
    find: '@/lib/auth-client',
    replacement: resolve('packages/journal-demo/src/auth-client.ts'),
  },
]
