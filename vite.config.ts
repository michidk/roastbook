import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import { devMigrations } from './scripts/vite-dev-migrations'

const roastbookEdition = process.env.ROASTBOOK_EDITION ?? 'standard'
if (roastbookEdition !== 'standard' && roastbookEdition !== 'demo') {
  throw new Error('ROASTBOOK_EDITION must be standard or demo')
}

const config = defineConfig({
  define: {
    __ROASTBOOK_DEMO_MODE__: JSON.stringify(roastbookEdition === 'demo'),
  },
  resolve: {
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
    devtools(),
    devMigrations(),
    tailwindcss(),
    tanstackStart(),
    nitro({
      preset: 'bun',
      routes: { '/media/**': './src/lib/server/media-handler.ts' },
    }),
    viteReact(),
  ],
})

export default config
