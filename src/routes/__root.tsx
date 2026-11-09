import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  ClientOnly,
  createRootRoute,
  HeadContent,
  Outlet,
  redirect,
  Scripts,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { useEffect } from 'react'
import { JournalSyncStatus } from '@/components/journal-sync-status'
import { AppExtensions } from '@/extension-points/app-extensions'

import '../styles.css'
import { Button } from '@roastbook/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@roastbook/ui/card'
import { ScrollArea } from '@roastbook/ui/scroll-area'
import { TooltipProvider } from '@roastbook/ui/tooltip'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { AppNavbar } from '@/components/app-navbar'
import { DemoNotice } from '@/components/edition-ui'
import { ErrorDetails } from '@/components/error-details'
import { InstallAppHint } from '@/components/install-app-hint'
import { OfflineBanner } from '@/components/offline-banner'
import { PwaManager } from '@/components/pwa-manager'
import { RouteNotFound } from '@/components/route-not-found'
import { AppPending } from '@/components/route-pending'
import { Toaster } from '@/components/toaster'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { DEMO_MODE, PREFERENCES_STORAGE_KEY } from '@/lib/build-mode'
import { checkConnection, isConnectionOnline } from '@/lib/connection-status'
import { DEFAULT_APP_SETTINGS } from '@/lib/default-app-settings'
import { getErrorDisplayState } from '@/lib/error-display'
import {
  getOfflineOwner,
  restoreOfflineOwner,
  selectOfflineOwner,
} from '@/lib/journal-owner'
import { usePreferencesStore } from '@/lib/preferences-store'
import { getCurrentAccount } from '@/lib/server/account'
import {
  isDarkTheme,
  PALETTE_STORAGE_KEY,
  THEME_BOOTSTRAP_SCRIPT,
  THEME_COLORS,
  themeColor,
} from '@/lib/theme'
import { cn } from '@/lib/utils'

export const Route = createRootRoute({
  ssr: ({ location }) =>
    !DEMO_MODE &&
    (location.pathname === '/login' || location.pathname === '/oauth/consent'),
  beforeLoad: ({ location }) => {
    if (
      DEMO_MODE &&
      (location.pathname === '/login' ||
        location.pathname.startsWith('/oauth/') ||
        location.pathname.startsWith('/admin') ||
        location.pathname === '/settings/account')
    )
      throw redirect({ to: '/settings' })
  },
  loader: async ({ location }) => {
    if (
      location.pathname === '/login' ||
      location.pathname === '/offline-shell' ||
      location.pathname === '/oauth/consent'
    )
      return DEFAULT_APP_SETTINGS
    if (!DEMO_MODE) {
      try {
        const state = await getCurrentAccount()
        await selectOfflineOwner(state.ownerId)
      } catch (error) {
        if (!(error instanceof TypeError)) throw error
      }
    }
    try {
      // The journal runtime loads in its own chunk.
      const { getAppSettings } = await import('@/journal/app-settings')
      return await getAppSettings()
    } catch (error) {
      // Offline settings stay reachable when the journal cannot open.
      if (!DEMO_MODE && location.pathname === '/settings/offline')
        return { ...DEFAULT_APP_SETTINGS, journalOwner: getOfflineOwner() }
      throw error
    }
  },
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
        content: DEMO_MODE ? 'no' : 'yes',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: DEMO_MODE ? 'no' : 'yes',
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
      ...(!DEMO_MODE
        ? [
            {
              rel: 'manifest',
              href: '/manifest.json',
              crossOrigin: 'use-credentials' as const,
            },
          ]
        : []),
    ],
  }),
  component: DEMO_MODE ? DemoRootComponent : RootComponent,
  pendingComponent: AppPending,
  shellComponent: RootDocument,
  errorComponent: RootErrorComponent,
  notFoundComponent: () => <RouteNotFound />,
})

function DemoRootComponent() {
  return (
    <ClientOnly fallback={<AppPending />}>
      <RootComponent />
    </ClientOnly>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const settings = Route.useLoaderData()
  if (!DEMO_MODE && settings?.journalOwner)
    restoreOfflineOwner(settings.journalOwner)

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-light-theme={settings?.lightTheme ?? 'light-roast'}
      data-dark-theme={settings?.darkTheme ?? 'dark-roast'}
      data-background-grain={String(settings?.backgroundGrainEnabled !== false)}
    >
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

function SettingsHydrator() {
  const settings = Route.useLoaderData()
  const lightTheme = settings?.lightTheme ?? 'light-roast'
  const darkTheme = settings?.darkTheme ?? 'dark-roast'
  const backgroundGrainEnabled = settings?.backgroundGrainEnabled !== false
  const theme = usePreferencesStore((state) => state.theme)
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated)

  useEffect(() => {
    if (!DEMO_MODE) return
    const onStorage = (event: StorageEvent) => {
      if (event.key === PREFERENCES_STORAGE_KEY)
        void usePreferencesStore.persist.rehydrate()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

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
      const color = themeColor(isDark, lightTheme, darkTheme)
      document.documentElement.dataset.backgroundGrain = String(
        backgroundGrainEnabled,
      )
      document.documentElement.dataset.lightTheme = lightTheme
      document.documentElement.dataset.darkTheme = darkTheme
      try {
        localStorage.setItem(
          PALETTE_STORAGE_KEY,
          JSON.stringify({ lightTheme, darkTheme }),
        )
      } catch {
        // Storage can be unavailable; only the API reference reads this.
      }
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
  }, [hasHydrated, theme, lightTheme, darkTheme, backgroundGrainEnabled])

  return null
}

function RootErrorComponent({ error }: { error: unknown }) {
  const router = useRouter()
  const isOnline = useOnlineStatus()
  const errorState = getErrorDisplayState(error)

  return (
    <TooltipProvider>
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <AppNavbar demoMode={DEMO_MODE} />
        {DEMO_MODE ? <DemoNotice /> : <JournalSyncStatus />}
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
  const login = useRouterState({
    select: (state) =>
      state.location.pathname === '/login' ||
      state.location.pathname === '/oauth/consent',
  })
  const settings = Route.useLoaderData()
  const isOnline = useOnlineStatus()

  const router = useRouter()
  useEffect(() => {
    if (login || DEMO_MODE) return
    // Pages reload when the app returns after a while, since the journal may
    // have changed elsewhere.
    let hiddenAt: number | undefined
    const reload = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt !== undefined && Date.now() - hiddenAt > 30_000) {
        hiddenAt = undefined
        // After sleep the network can lag the tab; a failed reload would
        // replace the page with an error, so confirm the server first.
        void checkConnection().then(() => {
          if (isConnectionOnline()) void router.invalidate()
        })
      }
    }
    document.addEventListener('visibilitychange', reload)
    return () => document.removeEventListener('visibilitychange', reload)
  }, [login, router])
  useEffect(() => {
    if (login || DEMO_MODE) return
    // Only a browser with a device copy syncs; others use the server directly.
    const sync = () =>
      void import('@/journal/local/device-copy')
        .then(async ({ keepsDeviceCopyFor }) => {
          const owner = getOfflineOwner()
          if (owner === undefined || !(await keepsDeviceCopyFor(owner))) return
          const { synchronizeEditionJournal } = await import(
            '@/journal/local/edition'
          )
          await synchronizeEditionJournal()
        })
        .catch(() => undefined)
    // Reconnecting always sends saved changes; periodic refreshes need a visible tab.
    const refresh = () => {
      if (document.visibilityState === 'visible') sync()
    }
    refresh()
    window.addEventListener('online', sync)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const timer = window.setInterval(refresh, 30000)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.clearInterval(timer)
    }
  }, [login])

  if (login)
    return (
      <>
        <div data-auth-page className="h-dvh overflow-y-auto">
          <Outlet />
        </div>
        <Toaster />
        <AppExtensions userId={null} />
      </>
    )

  return (
    <TooltipProvider>
      <NavigationProgress />
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <AppNavbar demoMode={settings.demoMode} account={settings.account} />
        {settings.demoMode ? null : <JournalSyncStatus />}
        <OfflineBanner isOnline={isOnline} demoMode={settings.demoMode} />
        <ScrollArea
          className="min-h-0 flex-1"
          viewportProps={{ id: 'app-scroll-area' }}
        >
          <div className="flex min-h-full flex-col">
            {DEMO_MODE ? <DemoNotice /> : null}
            <InstallAppHint />
            <main
              id="main-content"
              className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:py-8 md:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8"
            >
              <Outlet />
            </main>
          </div>
        </ScrollArea>
      </div>
      <Toaster />
      <AppExtensions userId={settings.account?.id ?? null} />
    </TooltipProvider>
  )
}

/** A thin bar while the next page loads, before its skeleton would show. */
function NavigationProgress() {
  const loading = useRouterState({ select: (state) => state.isLoading })
  if (!loading) return null
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="roastbook-navigation-progress fixed inset-x-0 top-0 z-50 h-0.5 bg-primary"
    />
  )
}
