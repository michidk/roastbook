import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import type { FormEvent } from 'react'
import { useEffect } from 'react'
import { toast } from 'sonner'

import '../styles.css'
import { AlertTriangle, Home, LockKeyhole, RefreshCw } from 'lucide-react'
import { AppNavbar } from '@/components/app-navbar'
import { ErrorDetails } from '@/components/error-details'
import { RouteNotFound } from '@/components/route-not-found'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getErrorDisplayState } from '@/lib/error-display'
import { usePreferencesStore } from '@/lib/preferences-store'
import { getAppSettings } from '@/lib/server/settings'

export const Route = createRootRoute({
  loader: () => getAppSettings(),
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
        title: 'Roastbook',
      },
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        href: '/roastbook-logo.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
  errorComponent: RootErrorComponent,
  notFoundComponent: () => <RouteNotFound />,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const settings = Route.useLoaderData()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body
        className={
          settings.backgroundTextureEnabled ? undefined : 'texture-disabled'
        }
      >
        <SettingsHydrator />
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
  const theme = usePreferencesStore((state) => state.theme)
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated)

  useEffect(() => {
    void usePreferencesStore.persist.rehydrate()
  }, [])

  useEffect(() => {
    if (!hasHydrated) return

    const browserTheme = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const isDark =
        theme === 'dark' || (theme === 'system' && browserTheme.matches)
      document.documentElement.classList.toggle('dark', isDark)
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
    }

    applyTheme()
    if (theme !== 'system') return

    browserTheme.addEventListener('change', applyTheme)
    return () => browserTheme.removeEventListener('change', applyTheme)
  }, [hasHydrated, theme])

  return null
}

function RootErrorComponent({ error }: { error: Error }) {
  const router = useRouter()
  const errorState = getErrorDisplayState(error)

  return (
    <TooltipProvider>
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <AppNavbar />
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
  const preventDemoSubmit = (event: FormEvent<HTMLElement>) => {
    event.preventDefault()
    toast.info('Demo mode is read-only. Changes are disabled.')
  }

  return (
    <TooltipProvider>
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <AppNavbar demoMode={settings.demoMode} />
        <ScrollArea
          className="min-h-0 flex-1"
          viewportProps={{ id: 'app-scroll-area' }}
        >
          <div className="flex min-h-full flex-col">
            {settings.demoMode ? (
              <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-sm font-medium">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  Demo mode: you can explore everything, but changes are
                  disabled.
                </div>
              </div>
            ) : null}
            <main
              id="main-content"
              onSubmitCapture={
                settings.demoMode ? preventDemoSubmit : undefined
              }
              className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:py-8 md:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8"
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
