import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview } from '@storybook/react-vite'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { TooltipProvider } from '../src/components/ui/tooltip'
import type { AppSettings } from '../src/lib/app-settings'
import { DEFAULT_TASTE_PROFILE_CONFIG } from '../src/lib/taste-profile'
import '../src/styles.css'
import './preview.css'

const settings = {
  demoMode: false,
  backgroundTextureEnabled: false,
  defaultCurrency: 'EUR',
  dateFormat: 'day-month-year-slash',
  defaultListView: 'grid',
  defaultMapLocation: null,
  numberFormat: 'decimal-point',
  tasteProfile: DEFAULT_TASTE_PROFILE_CONFIG,
  timeZone: 'UTC',
} satisfies AppSettings

const preview: Preview = {
  tags: ['autodocs'],
  initialGlobals: { theme: 'light' },
  parameters: {
    layout: 'padded',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    viewport: {
      options: {
        phone: { name: 'Phone', styles: { width: '375px', height: '812px' } },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1280px', height: '900px' },
        },
      },
    },
  },
  loaders: [
    async (context) => {
      const appSettings: Partial<AppSettings> =
        context.parameters.appSettings ?? {}
      const root = createRootRoute({
        loader: () => ({ ...settings, ...appSettings }),
      })
      const storyRouter = createRouter({
        routeTree: root,
        history: createMemoryHistory({ initialEntries: ['/'] }),
      })
      await storyRouter.load()
      return { storyRouter }
    },
  ],
  decorators: [
    withThemeByClassName({
      themes: { light: '', dark: 'dark' },
      defaultTheme: 'light',
    }),
    function WithAppContext(Story, context) {
      return (
        <TooltipProvider>
          <div className="mx-auto w-full max-w-7xl text-foreground">
            <RouterContextProvider router={context.loaded.storyRouter}>
              <Story />
            </RouterContextProvider>
          </div>
          <Toaster />
        </TooltipProvider>
      )
    },
  ],
}

export default preview
