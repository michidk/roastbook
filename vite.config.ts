import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, type PluginOption } from 'vite'
import { demoServiceAliases } from './scripts/demo-aliases'
import { demoAssets } from './scripts/vite-demo-assets'
import { demoLocalPlugin } from './scripts/vite-demo-local'
import { demoServices } from './scripts/vite-demo-services'
import { devMigrations } from './scripts/vite-dev-migrations'
import { journalPlatform } from './scripts/vite-journal-platform'

// Optional private build extension, overlaid into ./extension before building.
interface BuildExtension {
  aliases: { find: string; replacement: string }[]
  plugins: PluginOption[]
}
const extension: BuildExtension | undefined =
  process.env.ROASTBOOK_EXTENSION === 'true'
    ? (await import(pathToFileURL(resolve('extension/vite.mjs')).href)).default
    : undefined
const serverSchema = extension?.aliases.find(({ find }) =>
  new RegExp(find).test('@/db/schema'),
)?.replacement
const roastbookEdition = process.env.ROASTBOOK_EDITION ?? 'standard'
if (roastbookEdition !== 'standard' && roastbookEdition !== 'demo') {
  throw new Error('ROASTBOOK_EDITION must be standard or demo')
}

if (extension && roastbookEdition === 'demo')
  throw new Error('Build extensions require the standard edition')

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
            // Journal functions run on every page; keep them in one shared chunk.
            { name: 'journal', test: /\/src\/journal\// },
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
    alias: extension
      ? extension.aliases.map(({ find, replacement }) => ({
          find: new RegExp(find),
          replacement: resolve(replacement),
        }))
      : roastbookEdition === 'demo'
        ? [
            ...demoServiceAliases,
            {
              find: /^@\/components\/edition-ui$/,
              replacement: resolve('packages/journal-demo/src/ui.tsx'),
            },
            {
              find: /^@\/lib\/server\/auth\/request.server$/,
              replacement: resolve(
                'packages/journal-demo/src/request.server.ts',
              ),
            },
            {
              find: /^@\/db$/,
              replacement: resolve(
                'packages/journal-demo/src/database.server.ts',
              ),
            },
            {
              find: /^@\/lib\/storage$/,
              replacement: resolve('packages/journal-demo/src/storage.ts'),
            },
            {
              find: /^@\/lib\/thumbnail-image$/,
              replacement: resolve(
                'packages/journal-demo/src/thumbnail-image.ts',
              ),
            },
            {
              find: /^@tanstack\/ai$/,
              replacement: resolve('packages/journal-demo/src/tanstack-ai.ts'),
            },
            {
              find: /^@tanstack\/ai-openai(?:\/compatible)?$/,
              replacement: resolve(
                'packages/journal-demo/src/tanstack-ai-openai.ts',
              ),
            },
            {
              find: /^@tanstack\/ai-openai\/tools$/,
              replacement: resolve(
                'packages/journal-demo/src/tanstack-ai-openai-tools.ts',
              ),
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
    journalPlatform(
      roastbookEdition === 'demo' ? 'demo' : 'standard',
      serverSchema && resolve(serverSchema),
    ),
    {
      name: 'roastbook-schema-declarations',
      transform(code, id) {
        // Schema construction has no external effects. Allow unused server
        // imports to disappear after Start removes server-function handlers.
        if (
          id === resolve('src/db/index.ts') ||
          id === resolve('src/db/schema.ts')
        )
          return { code, moduleSideEffects: false }
      },
    },
    ...(roastbookEdition === 'demo'
      ? [demoServices(), demoAssets(), demoLocalPlugin()]
      : []),
    ...(!extension
      ? [devtools(), ...(roastbookEdition === 'demo' ? [] : [devMigrations()])]
      : []),
    ...(extension?.plugins ?? []),
    tailwindcss(),
    tanstackStart({
      ...(roastbookEdition === 'demo'
        ? {}
        : {
            spa: {
              enabled: true,
              maskPath: '/offline-shell',
              prerender: { outputPath: '/offline-shell.html' },
            },
          }),
      router: {
        codeSplittingOptions: {
          // Loaders query the local journal, so each route's loader and page
          // load together in one lazy chunk. Pending and error screens stay
          // separate so they can render while that chunk downloads.
          defaultBehavior: [
            ['loader', 'component'],
            ['pendingComponent', 'errorComponent', 'notFoundComponent'],
          ],
        },
      },
    }),
    ...(!extension
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
