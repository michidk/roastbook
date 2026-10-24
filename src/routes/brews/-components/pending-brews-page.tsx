import { Coffee, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { getErrorMessage } from '@/lib/error-message'
import {
  discardPendingBrew,
  retryPendingBrew,
  usePendingBrewsStore,
} from '@/modules/offline/pending-store'
import { requestPendingSync } from '@/modules/offline/sync-trigger'
import type { PendingBrew, PendingBrewStatus } from '@/modules/offline/types'
import { PendingChanges } from '@/routes/brews/-components/pending-changes'

const STATUS_LABELS: Record<PendingBrewStatus, string> = {
  pending: 'Waiting to sync',
  'auth-required': 'Sign in to sync',
  failed: 'Needs attention',
}

function statusVariant(status: PendingBrewStatus) {
  if (status === 'failed') return 'destructive' as const
  if (status === 'auth-required') return 'outline' as const
  return 'secondary' as const
}

function PendingBrewDetails({
  item,
  formatDateTime,
}: {
  readonly item: PendingBrew
  readonly formatDateTime: ReturnType<typeof useDateTimeFormatter>
}) {
  const details = [
    item.summary.beanName,
    item.summary.doseGrams ? `${item.summary.doseGrams} g in` : null,
    item.summary.yieldGrams ? `${item.summary.yieldGrams} g out` : null,
    item.summary.shotTimeSeconds ? `${item.summary.shotTimeSeconds} s` : null,
  ].filter(Boolean)

  return (
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-bold">
          {item.summary.methodName}
        </h2>
        <Badge variant={statusVariant(item.status)}>
          {STATUS_LABELS[item.status]}
        </Badge>
      </div>
      {details.length > 0 ? (
        <p className="text-sm text-muted-foreground">{details.join(' · ')}</p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Brewed {formatDateTime(item.summary.brewedAt)}
      </p>
      <p className="text-xs text-muted-foreground">
        Saved on this device {formatDateTime(item.createdAt)}
      </p>
      {item.lastError ? (
        <p className="text-sm text-destructive-text">{item.lastError}</p>
      ) : null}
    </div>
  )
}

function PendingBrewActions({
  item,
  isOnline,
  isSyncing,
}: {
  readonly item: PendingBrew
  readonly isOnline: boolean
  readonly isSyncing: boolean
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {item.status === 'auth-required' ? (
        <Button
          type="button"
          size="sm"
          disabled={!isOnline}
          onClick={() => window.location.reload()}
        >
          Sign in
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!isOnline || isSyncing}
        onClick={() => {
          void retryPendingBrew(item.operationId).catch((error) => {
            toast.error(
              getErrorMessage(error, 'Could not retry this pending brew'),
            )
          })
        }}
      >
        Retry
      </Button>
      <DeleteConfirmation
        title="Discard pending brew?"
        description="This removes the unsynced brew from this device. It cannot be recovered."
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={isSyncing}
            aria-label="Discard pending brew"
            className="text-destructive-text hover:bg-destructive/10 hover:text-destructive-text"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
          </Button>
        }
        onConfirm={async () => {
          await discardPendingBrew(item.operationId)
          toast.success('Pending brew discarded')
        }}
      />
    </div>
  )
}

function PendingBrewCard({
  item,
  isOnline,
  isSyncing,
  formatDateTime,
}: {
  readonly item: PendingBrew
  readonly isOnline: boolean
  readonly isSyncing: boolean
  readonly formatDateTime: ReturnType<typeof useDateTimeFormatter>
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PendingBrewDetails item={item} formatDateTime={formatDateTime} />
        <PendingBrewActions
          item={item}
          isOnline={isOnline}
          isSyncing={isSyncing}
        />
      </CardContent>
    </Card>
  )
}

function PendingBrewsLoading() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        Loading pending brews…
      </CardContent>
    </Card>
  )
}

function PendingBrewsLoadError({
  message,
  onRetry,
}: {
  readonly message: string
  readonly onRetry: () => void
}) {
  return (
    <Card>
      <CardContent className="space-y-3 py-8 text-center">
        <p className="font-semibold">Could not read pending brews</p>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}

function PendingBrewsList({
  items,
  isOnline,
  isSyncing,
  loadError,
  formatDateTime,
}: {
  readonly items: readonly PendingBrew[]
  readonly isOnline: boolean
  readonly isSyncing: boolean
  readonly loadError: string | null
  readonly formatDateTime: ReturnType<typeof useDateTimeFormatter>
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          These brews are stored in this browser. They are not on the server
          until they sync.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!isOnline || isSyncing}
          aria-busy={isSyncing}
          onClick={() => {
            requestPendingSync()
          }}
        >
          <RefreshCw
            className={isSyncing ? 'animate-spin' : undefined}
            aria-hidden="true"
          />
          {isSyncing ? 'Syncing…' : 'Sync now'}
        </Button>
      </div>

      {loadError ? (
        <p className="text-sm text-destructive-text">
          Could not refresh saved brews: {loadError}
        </p>
      ) : null}

      {items.map((item) => (
        <PendingBrewCard
          key={item.operationId}
          item={item}
          isOnline={isOnline}
          isSyncing={isSyncing}
          formatDateTime={formatDateTime}
        />
      ))}
    </div>
  )
}

export function PendingBrewsPage() {
  const items = usePendingBrewsStore((state) => state.items)
  const isHydrated = usePendingBrewsStore((state) => state.isHydrated)
  const isSyncing = usePendingBrewsStore((state) => state.isSyncing)
  const loadError = usePendingBrewsStore((state) => state.loadError)
  const hydrate = usePendingBrewsStore((state) => state.hydrate)
  const isOnline = useOnlineStatus()
  const formatDateTime = useDateTimeFormatter()

  useEffect(() => {
    if (!isHydrated) void hydrate()
  }, [hydrate, isHydrated])

  if (!isHydrated) return <PendingBrewsLoading />
  if (loadError && items.length === 0) {
    return (
      <PendingBrewsLoadError
        message={loadError}
        onRetry={() => void hydrate()}
      />
    )
  }
  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <PendingChanges isOnline={isOnline} isSyncing={isSyncing} />
        <EmptyState
          icon={Coffee}
          title="No pending brews"
          description="Brews saved on this device appear here until they sync."
          actionLabel="Log a brew"
          actionHref="/brews/new"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PendingChanges isOnline={isOnline} isSyncing={isSyncing} />
      <PendingBrewsList
        items={items}
        isOnline={isOnline}
        isSyncing={isSyncing}
        loadError={loadError}
        formatDateTime={formatDateTime}
      />
    </div>
  )
}
