import { WifiOff } from 'lucide-react'

export function OfflineBanner({
  isOnline,
  demoMode,
}: {
  readonly isOnline: boolean
  readonly demoMode: boolean
}) {
  const hidden = isOnline || demoMode

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        hidden
          ? 'sr-only'
          : 'border-b border-warning-border bg-warning px-4 py-2 text-warning-foreground'
      }
    >
      {hidden ? null : (
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-sm font-medium">
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          You're offline. Journal changes stay on this device and sync when you
          reconnect.
        </div>
      )}
    </div>
  )
}
