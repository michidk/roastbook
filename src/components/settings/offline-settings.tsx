import type { JournalState } from '@roastbook/journal-domain/state'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  Clock3,
  Database,
  HardDrive,
  LogIn,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { JournalSyncNotice } from '@/components/journal-sync-notice'
import { PanelSection } from '@/components/section-layout'
import { Button } from '@/components/ui/button'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { useOnlineStatus } from '@/hooks/use-online-status'
import {
  getClientJournal,
  subscribeJournalChanges,
  synchronizeJournal,
} from '@/lib/client/local-journal'
import { getErrorMessage } from '@/lib/error-message'
import { formatBytes } from '@/lib/utils'
import {
  type OfflineSyncMetadata,
  readOfflineSyncMetadata,
} from '@/modules/offline/local-data'
import { listOperations } from '@/modules/offline/operation-queue'
import {
  isVisibleOperationStatus,
  type OfflineOperation,
  type OfflineOperationStatus,
} from '@/modules/offline/operations'
import { usePendingBrewsStore } from '@/modules/offline/pending-store'
import {
  clearOfflineCaches,
  deleteOfflineDatabase,
} from '@/modules/offline/storage'
import {
  requestPendingSync,
  subscribeToPendingSyncFinished,
} from '@/modules/offline/sync-trigger'
import { getOfflineRxDatabase } from '@/modules/rxdb/offline-database'

interface OfflineSnapshot {
  readonly journal: JournalState | null
  readonly operations: OfflineOperation[]
  readonly metadata: OfflineSyncMetadata
  readonly usageBytes: number | null
  readonly quotaBytes: number | null
}

interface OfflineStatProps {
  readonly label: string
  readonly value: string
  readonly detail: string
  readonly icon: ComponentType<{
    readonly className?: string
    readonly 'aria-hidden'?: boolean
  }>
}

function OfflineStat({ label, value, detail, icon: Icon }: OfflineStatProps) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden={true} />
        <span>{label}</span>
      </dt>
      <dd className="mt-1">
        <span className="block font-display text-xl leading-none font-bold tabular-nums">
          {value}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {detail}
        </span>
      </dd>
    </div>
  )
}

function countStatus(
  operations: readonly OfflineOperation[],
  statuses: readonly OfflineOperationStatus[],
): number {
  return operations.filter((operation) => statuses.includes(operation.status))
    .length
}

export function OfflineSettings() {
  const isOnline = useOnlineStatus()
  const isSyncing = usePendingBrewsStore((state) => state.isSyncing)
  const formatDateTime = useDateTimeFormatter()
  const formatNumber = useNumberFormatter()
  const [snapshot, setSnapshot] = useState<OfflineSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isResettingShell, setIsResettingShell] = useState(false)

  const loadSnapshot = useCallback(async () => {
    setIsLoading(true)
    try {
      const [operations, metadata, estimate, journal] = await Promise.all([
        listOperations(),
        readOfflineSyncMetadata(),
        typeof navigator !== 'undefined' && navigator.storage?.estimate
          ? navigator.storage.estimate().catch(() => null)
          : Promise.resolve(null),
        getClientJournal()
          .then((journal) => journal.read())
          .catch(() => null),
      ])
      setSnapshot({
        journal,
        operations,
        metadata,
        usageBytes: estimate?.usage ?? null,
        quotaBytes: estimate?.quota ?? null,
      })
      setLoadError(null)
    } catch (error) {
      setLoadError(
        getErrorMessage(error, 'Could not read offline data from this browser'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSnapshot()
    const unsubscribeSync = subscribeToPendingSyncFinished(() => {
      void loadSnapshot()
    })
    const unsubscribeJournal = subscribeJournalChanges(() => {
      void loadSnapshot()
    })
    return () => {
      unsubscribeSync()
      unsubscribeJournal()
    }
  }, [loadSnapshot])

  useEffect(() => {
    let disposed = false
    let unsubscribe: (() => void) | undefined
    void getOfflineRxDatabase()
      .then((database) => {
        if (disposed) return
        const subscription = database.operations.$.subscribe(
          () => void loadSnapshot(),
        )
        unsubscribe = () => subscription.unsubscribe()
      })
      .catch(() => undefined)
    return () => {
      disposed = true
      unsubscribe?.()
    }
  }, [loadSnapshot])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SHELL_RESET_COMPLETE') {
        toast.success('Offline app shell reset. Reloading…')
        window.location.reload()
      }
      if (event.data?.type === 'SHELL_RESET_FAILED') {
        setIsResettingShell(false)
        toast.error('Could not reset the offline app shell')
      }
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () =>
      navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [])

  const visibleOperations =
    snapshot?.operations.filter((operation) =>
      isVisibleOperationStatus(operation.status),
    ) ?? []
  const journalPending = snapshot?.journal?.pending ?? []
  const waiting =
    journalPending.filter((entry) => entry.status === 'pending').length +
    countStatus(visibleOperations, ['pending', 'in-flight', 'retryable'])
  const needsAttention =
    journalPending.filter((entry) =>
      ['conflict', 'failed'].includes(entry.status),
    ).length + countStatus(visibleOperations, ['permanent', 'conflict'])
  const signInRequired =
    journalPending.filter((entry) => entry.status === 'auth-required').length +
    countStatus(visibleOperations, ['auth-required'])
  const unsynced = waiting + needsAttention + signInRequired

  const storageValue =
    snapshot?.usageBytes === null || snapshot?.usageBytes === undefined
      ? '—'
      : formatBytes(snapshot.usageBytes, formatNumber)
  const storageDetail =
    snapshot?.quotaBytes === null || snapshot?.quotaBytes === undefined
      ? 'Storage estimate unavailable'
      : `${formatBytes(snapshot.quotaBytes, formatNumber)} browser quota`

  const handleClearCaches = async () => {
    if (usePendingBrewsStore.getState().isSyncing) {
      toast.error('Wait for the current sync to finish before clearing data')
      return
    }
    try {
      await clearOfflineCaches()
      await loadSnapshot()
      toast.success('Cached offline data cleared')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not clear cached offline data'))
    }
  }

  const handleClearAll = async () => {
    if (usePendingBrewsStore.getState().isSyncing) {
      toast.error('Wait for the current sync to finish before clearing data')
      return
    }
    try {
      if (journalPending.length)
        throw new Error(
          'Sync or resolve the journal changes above before clearing local data.',
        )
      await (await getClientJournal()).remove()
      await deleteOfflineDatabase()
      await usePendingBrewsStore.getState().refresh()
      await loadSnapshot()
      window.location.reload()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not clear local offline data'))
    }
  }

  const handleResetShell = () => {
    if (
      typeof navigator === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !navigator.serviceWorker.controller
    ) {
      toast.error(
        'Reload the app once while online before repairing the offline shell',
      )
      return
    }
    setIsResettingShell(true)
    navigator.serviceWorker.controller.postMessage({ type: 'RESET_SHELL' })
  }

  return (
    <>
      <PanelSection
        title="Offline"
        description={
          isOnline
            ? 'This browser stores your downloaded journal, pictures, settings, and pending changes. You are online.'
            : 'You are offline. Journal changes stay on this device until the server confirms them after reconnecting.'
        }
        action={
          isOnline ? (
            <Wifi className="size-5 text-link" />
          ) : (
            <WifiOff className="size-5 text-destructive-text" />
          )
        }
      >
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
          <OfflineStat
            label="Connection"
            value={isOnline ? 'Online' : 'Offline'}
            detail={
              isOnline
                ? 'Network available. AI features can connect to the server.'
                : 'Changes stay on this device until you reconnect.'
            }
            icon={isOnline ? Wifi : WifiOff}
          />
          <OfflineStat
            label="Synchronization"
            value={
              snapshot === null
                ? 'Checking…'
                : isSyncing
                  ? 'Syncing…'
                  : unsynced > 0
                    ? 'Changes pending'
                    : 'No queued changes'
            }
            detail={
              isSyncing
                ? 'Sending local changes'
                : unsynced > 0
                  ? `${unsynced} operations on this device`
                  : 'No queued operations'
            }
            icon={RefreshCw}
          />
          <OfflineStat
            label="Waiting to sync"
            value={formatNumber(waiting)}
            detail="pending operations"
            icon={Database}
          />
          <OfflineStat
            label="Needs attention"
            value={formatNumber(needsAttention)}
            detail="permanent or conflict"
            icon={AlertTriangle}
          />
          <OfflineStat
            label="Sign in required"
            value={formatNumber(signInRequired)}
            detail="auth-required operations"
            icon={LogIn}
          />
          <OfflineStat
            label="Last successful sync"
            value={
              snapshot?.metadata.lastSuccessfulSyncAt
                ? formatDateTime(snapshot.metadata.lastSuccessfulSyncAt)
                : 'Never'
            }
            detail="server acknowledgement"
            icon={Clock3}
          />
          <OfflineStat
            label="Browser storage"
            value={storageValue}
            detail={storageDetail}
            icon={HardDrive}
          />
        </dl>

        {loadError ? (
          <p className="text-sm text-destructive-text">{loadError}</p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Journal lists, details, search, statistics, ordinary edits, settings,
          and added pictures use the same local journal in a tab or installed
          app. AI, external services, and account operations need a connection.
          Earlier offline work remains available in Pending changes.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isOnline || isSyncing || unsynced === 0}
            aria-busy={isSyncing}
            onClick={() => {
              requestPendingSync()
              void synchronizeJournal().catch((error) =>
                toast.error(
                  getErrorMessage(error, 'Could not synchronize journal'),
                ),
              )
            }}
          >
            <RefreshCw
              className={isSyncing ? 'animate-spin' : undefined}
              aria-hidden="true"
            />
            {isSyncing ? 'Syncing…' : 'Sync now'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLoading}
            onClick={() => void loadSnapshot()}
          >
            {isLoading ? 'Reading local data…' : 'Refresh'}
          </Button>
          {unsynced > 0 ? (
            <Button variant="link" size="sm" asChild>
              <Link to="/brews/pending">Review pending brews</Link>
            </Button>
          ) : null}
        </div>
      </PanelSection>

      <JournalSyncNotice />
      <PanelSection
        title="App shell"
        description="Re-download the cached application shell and static assets. Pending operations and local data are preserved."
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!isOnline || isResettingShell}
          aria-busy={isResettingShell}
          onClick={handleResetShell}
        >
          <Wrench
            className={isResettingShell ? 'animate-spin' : undefined}
            aria-hidden="true"
          />
          {isResettingShell ? 'Repairing…' : 'Repair app shell'}
        </Button>
      </PanelSection>

      <PanelSection
        title="Cached data"
        description="Earlier saved detail copies and reference snapshots. The shared journal and pending operations are kept."
      >
        <DeleteConfirmation
          title="Clear cached offline data?"
          description="Saved brew detail copies and reference data will be removed. Pending operations and their sync metadata stay on this device."
          confirmLabel="Clear cached data"
          busyLabel="Clearing…"
          trigger={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSyncing}
            >
              <Trash2 aria-hidden="true" />
              Clear cached data
            </Button>
          }
          onConfirm={handleClearCaches}
        />
      </PanelSection>

      <PanelSection
        title="Local data"
        description="The downloaded journal, pictures, earlier operation log, and caches for this account in this browser. Pending journal changes must be resolved first."
      >
        <DeleteConfirmation
          title="Clear all local offline data?"
          description={
            unsynced > 0
              ? `${unsynced} unsynced operation${unsynced === 1 ? '' : 's'} will be discarded permanently. This cannot be undone.`
              : 'The downloaded journal, local pictures, operation history, and caches will be removed. The journal will download again on your next online visit.'
          }
          confirmLabel="Clear all data"
          busyLabel="Clearing…"
          trigger={
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isSyncing || journalPending.length > 0 || !isOnline}
            >
              <Trash2 aria-hidden="true" />
              Clear all local data
            </Button>
          }
          onConfirm={handleClearAll}
        />
      </PanelSection>
    </>
  )
}
