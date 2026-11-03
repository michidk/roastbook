import { resolve } from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import { demoAssets } from './scripts/vite-demo-assets'
import { demoLocalPlugin } from './scripts/vite-demo-local'
import { devMigrations } from './scripts/vite-dev-migrations'

const cloudflareRuntime = process.env.ROASTBOOK_RUNTIME === 'cloudflare'
const roastbookEdition = process.env.ROASTBOOK_EDITION ?? 'standard'
if (roastbookEdition !== 'standard' && roastbookEdition !== 'demo') {
  throw new Error('ROASTBOOK_EDITION must be standard or demo')
}

if (cloudflareRuntime && roastbookEdition === 'demo')
  throw new Error('Cloudflare hosting requires the standard edition')

const cloudflareAliases = [
  {
    find: /^@\/lib\/server\/database-error.server$/,
    replacement: resolve('src/cloudflare/database-error.server.ts'),
  },
  {
    find: /^@\/lib\/server\/remote-url-policy.server$/,
    replacement: resolve('src/cloudflare/remote-url-policy.server.ts'),
  },
  {
    find: /^@\/lib\/server\/remote-image.server$/,
    replacement: resolve('src/cloudflare/remote-image.server.ts'),
  },
  {
    find: /^@\/lib\/server\/ai-provider-fetch.server$/,
    replacement: resolve('src/cloudflare/ai-provider-fetch.server.ts'),
  },
  {
    find: /^@better-auth\/cimd\/node$/,
    replacement: resolve('src/cloudflare/cimd-fetch.server.ts'),
  },
  {
    find: /^@\/db\/sql-dialect.server$/,
    replacement: resolve('src/db/d1/sql-dialect.server.ts'),
  },
  {
    find: /^@\/lib\/server\/health$/,
    replacement: resolve('src/cloudflare/health.server.ts'),
  },
  {
    find: /^@\/lib\/server\/auth\/oauth-coordination.server$/,
    replacement: resolve('src/cloudflare/oauth-coordination.server.ts'),
  },
  {
    find: /^@\/lib\/server\/auth\/jobs.server$/,
    replacement: resolve('src/cloudflare/auth/jobs.server.ts'),
  },
  {
    find: /^@\/lib\/server\/ai-request-accounting.server$/,
    replacement: resolve('src/cloudflare/ai-request-accounting.server.ts'),
  },
  {
    find: /^@\/lib\/server\/auth\/identity.server$/,
    replacement: resolve('src/cloudflare/auth/identity.server.ts'),
  },
  {
    find: /^@\/lib\/server\/auth\/account.server$/,
    replacement: resolve('src/cloudflare/auth/account.server.ts'),
  },
  {
    find: /^@\/lib\/server\/auth\/integrations.server$/,
    replacement: resolve('src/cloudflare/auth/integrations.server.ts'),
  },
  {
    find: /^@\/db\/journal-mutations.server$/,
    replacement: resolve('src/db/d1/journal-mutations.server.ts'),
  },
  {
    find: /^@\/lib\/server\/auth\/database-adapter.server$/,
    replacement: resolve('src/db/d1/auth-database-adapter.server.ts'),
  },
  { find: /^@\/db\/schema$/, replacement: resolve('src/db/d1/schema.ts') },
  { find: /^@\/db$/, replacement: resolve('src/db/d1/index.ts') },
  {
    find: /^@\/db\/connection.server$/,
    replacement: resolve('src/db/d1/connection.server.ts'),
  },
  {
    find: /^@\/db\/journal-context.server$/,
    replacement: resolve('src/db/d1/journal-context.server.ts'),
  },
  {
    find: /^@\/lib\/storage$/,
    replacement: resolve('src/cloudflare/storage.server.ts'),
  },
  {
    find: /^@\/lib\/thumbnail-image$/,
    replacement: resolve('src/cloudflare/images.server.ts'),
  },
  {
    find: /^@\/lib\/server\/auth\/email.server$/,
    replacement: resolve('src/cloudflare/auth-email.server.ts'),
  },
]

const config = defineConfig({
  // Dev/preview servers run behind sandbox proxies that forward arbitrary
  // hostnames, which Vite's host check would otherwise reject.
  server: {
    allowedHosts: true,
    watch: { ignored: ['**/.artifacts/**', '**/.output/**'] },
  },
  preview: { allowedHosts: true },
  build: {
    reportCompressedSize: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'validation', test: /node_modules\/zod\// },
            {
              name: 'router-runtime',
              test: /node_modules\/@tanstack\/(?:router-core|react-router)\//,
            },
          ],
        },
      },
    },
  },
  define: {
    __ROASTBOOK_DEMO_MODE__: JSON.stringify(roastbookEdition === 'demo'),
  },
  resolve: {
    alias: cloudflareRuntime
      ? cloudflareAliases
      : roastbookEdition === 'demo'
        ? [
            {
              find: /^@\/lib\/server\/auth\/request.server$/,
              replacement: resolve('src/lib/demo/request.server.ts'),
            },
            { find: /^@\/db$/, replacement: resolve('src/db/demo.ts') },
            {
              find: /^@\/lib\/storage$/,
              replacement: resolve('src/lib/demo/storage.ts'),
            },
            {
              find: /^@\/lib\/thumbnail-image$/,
              replacement: resolve('src/lib/demo/thumbnail-image.ts'),
            },
            {
              find: /^@tanstack\/ai$/,
              replacement: resolve('src/lib/demo/tanstack-ai.ts'),
            },
            {
              find: /^@tanstack\/ai-openai(?:\/compatible)?$/,
              replacement: resolve('src/lib/demo/tanstack-ai-openai.ts'),
            },
            {
              find: /^@tanstack\/ai-openai\/tools$/,
              replacement: resolve('src/lib/demo/tanstack-ai-openai-tools.ts'),
            },
          ]
        : [],
    tsconfigPaths: true,
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-dev-runtime',
      'react/jsx-runtime',
      '@base-ui/react/button',
      '@base-ui/react/collapsible',
      '@base-ui/react/combobox',
      '@base-ui/react/dialog',
      '@base-ui/react/input',
      '@base-ui/react/menu',
      '@base-ui/react/merge-props',
      '@base-ui/react/progress',
      '@base-ui/react/scroll-area',
      '@base-ui/react/select',
      '@base-ui/react/separator',
      '@base-ui/react/toggle',
      '@base-ui/react/tooltip',
      '@base-ui/react/use-render',
      '@tanstack/router-core',
      '@tanstack/router-core/isServer',
      '@tanstack/router-core/ssr/client',
      'seroval',
    ],
  },
  plugins: [
    {
      name: 'roastbook-schema-declarations',
      transform(code, id) {
        // Schema construction has no external effects. Allow unused server
        // imports to disappear after Start removes server-function handlers.
        if (
          id === resolve('src/db/schema.ts') ||
          id === resolve('src/db/d1/schema.ts')
        )
          return { code, moduleSideEffects: false }
      },
    },
    ...(roastbookEdition === 'demo' ? [demoAssets(), demoLocalPlugin()] : []),
    ...(!cloudflareRuntime
      ? [devtools(), ...(roastbookEdition === 'demo' ? [] : [devMigrations()])]
      : []),
    ...(cloudflareRuntime
      ? [
          cloudflare({
            configPath: 'wrangler.runtime.jsonc',
            viteEnvironment: { name: 'ssr' },
          }),
        ]
      : []),
    tailwindcss(),
    tanstackStart({
      router: {
        codeSplittingOptions: {
          // Keep route loaders in the critical route bundle so client-side
          // navigation can start data fetching immediately. Group the route
          // UI into one lazy chunk instead of creating a request per property.
          defaultBehavior: [
            [
              'component',
              'pendingComponent',
              'errorComponent',
              'notFoundComponent',
            ],
          ],
        },
      },
    }),
    ...(!cloudflareRuntime
      ? [
          nitro({
            preset: roastbookEdition === 'demo' ? 'vercel' : 'bun',
            routeRules: {
              ...(roastbookEdition === 'demo'
                ? {
                    '/demo-local/**': {
                      headers: { 'cache-control': 'no-cache' },
                    },
                  }
                : {}),
              '/sw.js': {
                headers: {
                  'cache-control': 'no-cache, no-store, must-revalidate',
                },
              },
              '/manifest.json': {
                headers: { 'cache-control': 'no-cache' },
              },
              '/offline.html': {
                headers: { 'cache-control': 'no-cache' },
              },
            },
            routes:
              roastbookEdition === 'demo'
                ? {}
                : { '/media/**': './src/lib/server/media-handler.ts' },
          }),
        ]
      : []),
    viteReact(),
  ],
})

export default config
