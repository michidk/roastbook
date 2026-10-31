import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import type { ComponentType, FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import '../styles.css'
import { AlertTriangle, Home, LockKeyhole, RefreshCw } from 'lucide-react'
import { AppNavbar } from '@/components/app-navbar'
import { ErrorDetails } from '@/components/error-details'
import { InstallAppHint } from '@/components/install-app-hint'
import { OfflineBanner } from '@/components/offline-banner'
import { PwaManager } from '@/components/pwa-manager'
import { RouteNotFound } from '@/components/route-not-found'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { DEMO_MODE, DEMO_MODE_READ_ONLY_MESSAGE } from '@/lib/build-mode'
import { getErrorDisplayState } from '@/lib/error-display'
import { usePreferencesStore } from '@/lib/preferences-store'
import { getAppSettings } from '@/lib/server/app-settings'
import { isDarkTheme, THEME_COLORS, themeColor } from '@/lib/theme'
import { cn } from '@/lib/utils'
import {
  cacheSettingsData,
  loadOfflineSettingsData,
} from '@/modules/offline/settings-cache'

export const Route = createRootRoute({
  loader: () => loadOfflineSettingsData('general', getAppSettings),
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        name: 'theme-color',
        content: THEME_COLORS.light,
      },
      {
        name: 'application-name',
        content: 'Roastbook',
      },
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'Roastbook',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'default',
      },
      {
        title: 'Roastbook',
      },
      ...(DEMO_MODE ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        href: '/logo192.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
        crossOrigin: 'use-credentials',
      },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
  errorComponent: RootErrorComponent,
  notFoundComponent: () => <RouteNotFound />,
})

const THEME_BOOTSTRAP_SCRIPT = `(function () {
  var theme = null
  try {
    var raw = localStorage.getItem('roastbook-settings')
    var stored = raw ? JSON.parse(raw) : null
    theme = stored && stored.state ? stored.state.theme : null
  } catch (error) {}
  try {
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    var dark = theme === 'dark' || (theme !== 'light' && systemDark)
    var color = dark ? '${THEME_COLORS.dark}' : '${THEME_COLORS.light}'
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    document.documentElement.style.backgroundColor = color
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
      meta.setAttribute('content', color)
    })
  } catch (error) {}
})()`

function RootDocument({ children }: { children: React.ReactNode }) {
  const settings = Route.useLoaderData()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static theme bootstrap must run before hydration */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body
        className={cn(
          settings?.backgroundTextureEnabled === false && 'texture-disabled',
        )}
      >
        <SettingsHydrator />
        <PwaManager />
        {children}
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{
              hideUntilHover: true,
              position: 'middle-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}

function OfflineStatusMount() {
  const [Status, setStatus] = useState<ComponentType | null>(null)

  useEffect(() => {
    let cancelled = false
    void import('@/components/pending-sync-banner')
      .then((module) => {
        if (!cancelled) setStatus(() => module.OfflineStatus)
      })
      .catch((error) => {
        console.error('Could not load the offline status UI', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return Status ? <Status /> : null
}

function SettingsHydrator() {
  const theme = usePreferencesStore((state) => state.theme)
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated)

  useEffect(() => {
    void Promise.resolve(usePreferencesStore.persist.rehydrate())
      .catch(() => undefined)
      .then(() => usePreferencesStore.getState().markHydrated())
  }, [])

  useEffect(() => {
    if (!hasHydrated) return

    const browserTheme = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const isDark = isDarkTheme(theme, browserTheme.matches)
      const color = themeColor(isDark)
      document.documentElement.classList.toggle('dark', isDark)
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
      document.documentElement.style.backgroundColor = color
      document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
        meta.setAttribute('content', color)
      })
    }

    applyTheme()
    if (theme !== 'system') return

    browserTheme.addEventListener('change', applyTheme)
    return () => browserTheme.removeEventListener('change', applyTheme)
  }, [hasHydrated, theme])

  return null
}

function RootErrorComponent({ error }: { error: unknown }) {
  const router = useRouter()
  const isOnline = useOnlineStatus()
  const errorState = getErrorDisplayState(error)

  return (
    <TooltipProvider>
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <AppNavbar />
        <OfflineStatusMount />
        <OfflineBanner isOnline={isOnline} demoMode={DEMO_MODE} />
        <ScrollArea
          className="min-h-0 flex-1"
          viewportProps={{ id: 'app-scroll-area' }}
        >
          <main
            id="main-content"
            className="min-h-full p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-4"
          >
            <div className="flex min-h-[50vh] items-center justify-center">
              <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <CardTitle>{errorState.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    {errorState.message}
                  </p>
                  {errorState.hint && (
                    <p className="text-sm text-center">{errorState.hint}</p>
                  )}
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => router.navigate({ to: '/' })}
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Go home
                    </Button>
                    <Button onClick={() => router.invalidate()}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try again
                    </Button>
                  </div>
                  {import.meta.env.DEV && <ErrorDetails error={error} />}
                </CardContent>
              </Card>
            </div>
          </main>
        </ScrollArea>
      </div>
      <Toaster />
    </TooltipProvider>
  )
}

function RootComponent() {
  const settings = Route.useLoaderData()
  const isOnline = useOnlineStatus()
  useEffect(() => {
    void cacheSettingsData('general', settings).catch(() => undefined)
  }, [settings])
  const preventDemoSubmit = (event: FormEvent<HTMLElement>) => {
    event.preventDefault()
    toast.info(DEMO_MODE_READ_ONLY_MESSAGE)
  }

  return (
    <TooltipProvider>
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <AppNavbar demoMode={settings.demoMode} />
        {settings.demoMode ? null : <OfflineStatusMount />}
        <OfflineBanner isOnline={isOnline} demoMode={settings.demoMode} />
        <ScrollArea
          className="min-h-0 flex-1"
          viewportProps={{ id: 'app-scroll-area' }}
        >
          <div className="flex min-h-full flex-col">
            {settings.demoMode ? (
              <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-sm font-medium">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  Demo mode: explore with sample data; changes are disabled.
                  First loads may be slower while the demo wakes up.
                </div>
              </div>
            ) : null}
            <InstallAppHint />
            <main
              id="main-content"
              onSubmitCapture={
                settings.demoMode ? preventDemoSubmit : undefined
              }
              className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:py-8 md:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8"
            >
              <Outlet />
            </main>
          </div>
        </ScrollArea>
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
