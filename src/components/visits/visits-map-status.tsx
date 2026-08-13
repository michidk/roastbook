import type { RefObject } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type VisitsMapStatusProps = {
  readonly status: "loading" | "ready" | "error"
  readonly onRetry: () => void
  readonly retryButtonRef: RefObject<HTMLButtonElement | null>
}

export function VisitsMapStatus({
  status,
  onRetry,
  retryButtonRef,
}: VisitsMapStatusProps) {
  if (status === "loading") {
    return (
      <div
        className="absolute inset-0 z-10"
        role="status"
        aria-label="Loading café map"
      >
        <Skeleton className="h-full w-full rounded-none" />
      </div>
    )
  }
  if (status !== "error") return null
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-secondary p-6 text-center"
      role="alert"
    >
      <div className="max-w-sm space-y-3">
        <p className="font-display text-lg font-bold">Map unavailable</p>
        <p className="text-sm text-muted-foreground">
          Retry when the map service is reachable.
        </p>
        <Button
          ref={retryButtonRef}
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={onRetry}
        >
          Retry map
        </Button>
      </div>
    </div>
  )
}
