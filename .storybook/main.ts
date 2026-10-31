import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'

const config: StorybookConfig = {
  stories: ['../src/components/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-themes'],
  framework: {
    name: '@storybook/react-vite',
    options: { builder: { viteConfigPath: '.storybook/vite.config.ts' } },
  },
  staticDirs: [
    '../public',
    './public',
    { from: '../scripts/seed-assets/bean-packaging', to: '/media/storybook' },
  ],
  async viteFinal(config) {
    const { mergeConfig } = await import('vite')
    return mergeConfig(config, {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          '@/hooks/use-online-status': fileURLToPath(
            new URL('./mocks/use-online-status.ts', import.meta.url),
          ),
          '@': fileURLToPath(new URL('../src', import.meta.url)),
        },
      },
      define: { __ROASTBOOK_DEMO_MODE__: 'false' },
    })
  },
  core: {
    disableTelemetry: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      ...(process.env.VIBEPOD_PREVIEW_DOMAIN
        ? [`roastbook-storybook.${process.env.VIBEPOD_PREVIEW_DOMAIN}`]
        : []),
    ],
  },
}

export default config
