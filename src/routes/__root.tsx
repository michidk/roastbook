import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouter,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '../styles.css?url'
import { AppNavbar } from '@/components/app-navbar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { getErrorDisplayState } from '@/lib/error-display'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Roastbook',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/roastbook-logo.png',
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
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

function RootErrorComponent({ error }: { error: Error }) {
  const router = useRouter()
  const errorState = getErrorDisplayState(error)

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col">
        <AppNavbar />
        <main id="main-content" className="flex-1 p-4">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Card className="max-w-md w-full">
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
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4">
                    <summary className="text-xs text-muted-foreground cursor-pointer">
                      Error details
                    </summary>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <Toaster />
    </TooltipProvider>
  )
}

function RootComponent() {
  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col">
        <AppNavbar />
        <main
          id="main-content"
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8"
        >
          <Outlet />
        </main>
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
