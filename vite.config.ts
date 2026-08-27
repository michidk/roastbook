import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import sharp from 'sharp'
import { defineConfig } from 'vite'
import { devMigrations } from './scripts/vite-dev-migrations'

const roastbookEdition = process.env.ROASTBOOK_EDITION ?? 'standard'
if (roastbookEdition !== 'standard' && roastbookEdition !== 'demo') {
  throw new Error('ROASTBOOK_EDITION must be standard or demo')
}

const demoAssets = () => ({
  name: 'roastbook-demo-assets',
  async generateBundle(this: { emitFile: (asset: object) => void }) {
    for (const filename of [
      'kraft-orange.webp',
      'forest-botanical.webp',
      'cobalt-sunburst.webp',
      'plum-orbit.webp',
      'teal-contours.webp',
    ]) {
      const source = readFileSync(
        resolve('scripts/seed-assets/bean-packaging', filename),
      )
      this.emitFile({
        type: 'asset',
        fileName: `media/demo/${filename}`,
        source,
      })
      this.emitFile({
        type: 'asset',
        fileName: `media/demo/${filename.replace('.webp', '.thumb.webp')}`,
        source,
      })
      this.emitFile({
        type: 'asset',
        fileName: `media/demo/${filename.replace('.webp', '.small.webp')}`,
        source: await sharp(source)
          .resize({ width: 128, withoutEnlargement: true })
          .webp({ quality: 72 })
          .toBuffer(),
      })
    }
    for (const filename of [
      'terracotta-wave.webp',
      'cobalt-arches.webp',
      'forest-diamond.webp',
      'plum-crescent.webp',
      'coral-pinwheel.webp',
    ]) {
      this.emitFile({
        type: 'asset',
        fileName: `media/demo-favicons/${filename}`,
        source: readFileSync(
          resolve('scripts/seed-assets/demo-favicons', filename),
        ),
      })
    }
  },
})

const config = defineConfig({
  // Dev/preview servers run behind sandbox proxies that forward arbitrary
  // hostnames, which Vite's host check would otherwise reject.
  server: { allowedHosts: true },
  preview: { allowedHosts: true },
  define: {
    __ROASTBOOK_DEMO_MODE__: JSON.stringify(roastbookEdition === 'demo'),
  },
  resolve: {
    alias:
      roastbookEdition === 'demo'
        ? [
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
              find: /^@tanstack\/ai-openai$/,
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
      '@base-ui/react/collapsible',
      '@base-ui/react/combobox',
      '@base-ui/react/dialog',
      '@base-ui/react/input',
      '@base-ui/react/menu',
      '@base-ui/react/merge-props',
      '@base-ui/react/progress',
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
    ...(roastbookEdition === 'demo' ? [demoAssets()] : []),
    devtools(),
    devMigrations(),
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
    nitro({
      preset: roastbookEdition === 'demo' ? 'vercel' : 'bun',
      routes:
        roastbookEdition === 'demo'
          ? {}
          : { '/media/**': './src/lib/server/media-handler.ts' },
    }),
    viteReact(),
  ],
})

export default config
