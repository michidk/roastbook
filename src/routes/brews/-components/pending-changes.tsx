import { AlertTriangle, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { getErrorMessage } from '@/lib/error-message'
import { acceptServerConflict } from '@/modules/offline/entity-operations'
import {
  discardOperation,
  forceOperation,
  listOperations,
  retryOperation,
} from '@/modules/offline/operation-queue'
import {
  isVisibleOperationStatus,
  type OfflineOperation,
  type OfflineOperationStatus,
} from '@/modules/offline/operations'
import { subscribeToPendingSyncFinished } from '@/modules/offline/sync-trigger'

const STATUS_LABELS: Record<OfflineOperationStatus, string> = {
  pending: 'Waiting to sync',
  'in-flight': 'Syncing',
  retryable: 'Will retry',
  permanent: 'Needs attention',
  'auth-required': 'Sign in to sync',
  conflict: 'Changed on server',
  cancelled: 'Cancelled',
  acknowledged: 'Synced',
}

type RunAction = (
  action: () => Promise<void>,
  successMessage: string,
) => Promise<void>

function operationLabel(operation: OfflineOperation): string {
  if (operation.entityType === 'brew') {
    if (operation.operationType === 'update') return 'Brew edit'
    if (operation.operationType === 'delete') return 'Brew deletion'
    if (operation.operationType === 'save-to-recipe') return 'Brew and recipe'
  }
  if (operation.entityType === 'recipe') {
    if (operation.operationType === 'create') return 'Recipe creation'
    if (operation.operationType === 'update') return 'Recipe edit'
    if (operation.operationType === 'delete') return 'Recipe deletion'
  }
  if (operation.entityType === 'brew-image') {
    if (operation.operationType === 'upload') return 'Picture upload'
    if (operation.operationType === 'remove-image') return 'Picture removal'
  }
  return `${operation.entityType} ${operation.operationType}`
}

function statusVariant(status: OfflineOperationStatus) {
  if (status === 'conflict' || status === 'permanent') {
    return 'destructive' as const
  }
  if (status === 'auth-required') return 'outline' as const
  return 'secondary' as const
}

function detailsFrom(operation: OfflineOperation): {
  label: string
  detail: string | null
} {
  if (operation.details && typeof operation.details === 'object') {
    const details = operation.details as {
      label?: unknown
      detail?: unknown
    }
    if (typeof details.label === 'string') {
      return {
        label: details.label,
        detail: typeof details.detail === 'string' ? details.detail : null,
      }
    }
  }
  return { label: operationLabel(operation), detail: null }
}

function isPendingChange(operation: OfflineOperation): boolean {
  if (!isVisibleOperationStatus(operation.status)) return false
  return !(
    operation.entityType === 'brew' && operation.operationType === 'create'
  )
}

function PendingOperationDetails({
  operation,
  formatDateTime,
}: {
  readonly operation: OfflineOperation
  readonly formatDateTime: ReturnType<typeof useDateTimeFormatter>
}) {
  const details = detailsFrom(operation)
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Pencil className="size-4 shrink-0 text-muted-foreground" />
        <h3 className="font-semibold">
          {details.label || operationLabel(operation)}
        </h3>
        <Badge variant={statusVariant(operation.status)}>
          {STATUS_LABELS[operation.status]}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {operationLabel(operation)}
        {details.detail ? ` · ${details.detail}` : ''}
      </p>
      <p className="text-xs text-muted-foreground">
        Saved on this device {formatDateTime(operation.createdAt)}
      </p>
      {operation.lastError ? (
        <p className="text-sm text-destructive-text">{operation.lastError}</p>
      ) : null}
      {operation.status === 'conflict' ? (
        <p className="flex items-start gap-2 text-sm text-destructive-text">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          This item changed on the server while it was offline.
        </p>
      ) : null}
    </div>
  )
}

function ConflictActions({
  operation,
  isOnline,
  isSyncing,
  runAction,
}: {
  readonly operation: OfflineOperation
  readonly isOnline: boolean
  readonly isSyncing: boolean
  readonly runAction: RunAction
}) {
  return (
    <>
      <Button
        type="button"
        size="sm"
        disabled={!isOnline || isSyncing}
        onClick={() =>
          void runAction(
            () => forceOperation(operation.id),
            'Local changes will overwrite the server copy',
          )
        }
      >
        Keep local
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          void runAction(
            () => acceptServerConflict(operation),
            'Server copy kept',
          )
        }
      >
        Accept server
      </Button>
    </>
  )
}

function StandardActions({
  operation,
  isOnline,
  isSyncing,
  runAction,
}: {
  readonly operation: OfflineOperation
  readonly isOnline: boolean
  readonly isSyncing: boolean
  readonly runAction: RunAction
}) {
  const canRetry =
    isOnline &&
    !isSyncing &&
    (operation.status === 'pending' ||
      operation.status === 'retryable' ||
      operation.status === 'permanent' ||
      operation.status === 'auth-required')

  return (
    <>
      {operation.status === 'auth-required' ? (
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
        disabled={!canRetry}
        onClick={() =>
          void runAction(() => retryOperation(operation.id), 'Retry queued')
        }
      >
        Retry
      </Button>
    </>
  )
}

function DiscardAction({
  operation,
  isSyncing,
  runAction,
}: {
  readonly operation: OfflineOperation
  readonly isSyncing: boolean
  readonly runAction: RunAction
}) {
  return (
    <DeleteConfirmation
      title="Discard this pending change?"
      description="The local change will be removed and will not be sent to the server."
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={isSyncing || operation.status === 'in-flight'}
          aria-label="Discard pending change"
          className="text-destructive-text hover:bg-destructive/10 hover:text-destructive-text"
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
      }
      onConfirm={() =>
        runAction(
          () => discardOperation(operation.id),
          'Pending change discarded',
        )
      }
    />
  )
}

function PendingOperationCard({
  operation,
  isOnline,
  isSyncing,
  formatDateTime,
  runAction,
}: {
  readonly operation: OfflineOperation
  readonly isOnline: boolean
  readonly isSyncing: boolean
  readonly formatDateTime: ReturnType<typeof useDateTimeFormatter>
  readonly runAction: RunAction
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PendingOperationDetails
          operation={operation}
          formatDateTime={formatDateTime}
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {operation.status === 'conflict' ? (
            <ConflictActions
              operation={operation}
              isOnline={isOnline}
              isSyncing={isSyncing}
              runAction={runAction}
            />
          ) : (
            <StandardActions
              operation={operation}
              isOnline={isOnline}
              isSyncing={isSyncing}
              runAction={runAction}
            />
          )}
          <DiscardAction
            operation={operation}
            isSyncing={isSyncing}
            runAction={runAction}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function PendingChangesHeader({
  onRefresh,
}: {
  readonly onRefresh: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2
          id="pending-changes-heading"
          className="font-display text-lg font-bold"
        >
          Other pending changes
        </h2>
        <p className="text-sm text-muted-foreground">
          Edits, deletions, and recipe operations saved on this device.
        </p>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onRefresh}>
        <RefreshCw aria-hidden="true" />
        Refresh
      </Button>
    </div>
  )
}

export function PendingChanges({
  isOnline,
  isSyncing,
}: {
  readonly isOnline: boolean
  readonly isSyncing: boolean
}) {
  const [operations, setOperations] = useState<OfflineOperation[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const formatDateTime = useDateTimeFormatter()

  const load = useCallback(async () => {
    try {
      const all = await listOperations()
      setOperations(all.filter(isPendingChange))
      setLoadError(null)
    } catch (error) {
      setLoadError(
        getErrorMessage(error, 'Could not read pending offline changes'),
      )
    }
  }, [])

  useEffect(() => {
    void load()
    return subscribeToPendingSyncFinished(() => {
      void load()
    })
  }, [load])

  const runAction = async (
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    try {
      await action()
      await load()
      toast.success(successMessage)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update this operation'))
    }
  }

  if (operations.length === 0 && !loadError) return null

  return (
    <section className="space-y-3" aria-labelledby="pending-changes-heading">
      <PendingChangesHeader onRefresh={() => void load()} />
      {loadError ? (
        <p className="text-sm text-destructive-text">{loadError}</p>
      ) : null}
      {operations.map((operation) => (
        <PendingOperationCard
          key={operation.id}
          operation={operation}
          isOnline={isOnline}
          isSyncing={isSyncing}
          formatDateTime={formatDateTime}
          runAction={runAction}
        />
      ))}
    </section>
  )
}
