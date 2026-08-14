import { Link, useRouter } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'
import { ErrorDetails } from '@/components/error-details'
import { Page } from '@/components/page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getErrorDisplayState } from '@/lib/error-display'

interface RouteErrorProps {
  error: Error
  backTo?: string
  backLabel?: string
}

export function RouteError({
  error,
  backTo,
  backLabel = 'Go back',
}: RouteErrorProps) {
  const router = useRouter()
  const errorState = getErrorDisplayState(error)

  return (
    <Page
      width="form"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle as="h1">{errorState.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {errorState.message}
          </p>
          {errorState.hint && (
            <p className="text-sm text-center">{errorState.hint}</p>
          )}
          <div className="flex gap-2 justify-center">
            {backTo && (
              <Button variant="outline" asChild>
                <Link to={backTo}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {backLabel}
                </Link>
              </Button>
            )}
            <Button onClick={() => router.invalidate()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
          {import.meta.env.DEV && <ErrorDetails error={error} />}
        </CardContent>
      </Card>
    </Page>
  )
}
