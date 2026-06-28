import { useRouter, Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react"
import { getErrorDisplayState } from "@/lib/error-display"

interface RouteErrorProps {
  error: Error
  backTo?: string
  backLabel?: string
}

export function RouteError({ error, backTo, backLabel = "Go back" }: RouteErrorProps) {
  const router = useRouter()
  const errorState = getErrorDisplayState(error)

  return (
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
          {process.env.NODE_ENV === "development" && error.stack && (
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
  )
}
