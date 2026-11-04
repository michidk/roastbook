import {
  AlertTriangle,
  Clock3,
  HardDrive,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { JournalSyncStatus } from '@/components/journal-sync-status'
import { PanelSection } from '@/components/section-layout'
import { Button } from '@/components/ui/button'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { useOnlineStatus } from '@/hooks/use-online-status'
import {
  openEditionJournal,
  synchronizeEditionJournal,
} from '@/journal/local/edition'
import { useSyncStatus } from '@/journal/local/sync-status'
import { getErrorMessage } from '@/lib/error-message'
import { formatBytes } from '@/lib/utils'

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

export function OfflineSettings() {
  const isOnline = useOnlineStatus()
  const status = useSyncStatus()
  const formatDateTime = useDateTimeFormatter()
  const formatNumber = useNumberFormatter()
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(
    null,
  )
  const [legacyFailed, setLegacyFailed] = useState(0)
  const [isResettingShell, setIsResettingShell] = useState(false)

  useEffect(() => {
    void navigator.storage
      ?.estimate()
      .then((estimate) =>
        setUsage({ used: estimate.usage ?? 0, quota: estimate.quota ?? 0 }),
      )
      .catch(() => undefined)
    void openEditionJournal()
      .then((journal) => journal.getState<number>('legacyFailed'))
      .then((failed) => setLegacyFailed(failed ?? 0))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
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

  const unsynced = status.pending + status.conflicts

  const handleResetShell = () => {
    if (!navigator.serviceWorker?.controller) {
      toast.error(
        'Reload the app once while online before repairing the offline shell',
      )
      return
    }
    setIsResettingShell(true)
    navigator.serviceWorker.controller.postMessage({ type: 'RESET_SHELL' })
  }

  const handleClear = async () => {
    try {
      const { deleteLocalJournal } = await import('@/journal/local/client')
      await deleteLocalJournal(await openEditionJournal())
      toast.success('This browser’s copy was removed. Downloading it again…')
      window.location.reload()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not clear local data'))
    }
  }

  return (
    <>
      <PanelSection
        title="Offline"
        description={
          isOnline
            ? 'Your journal is kept in this browser and syncs with your account. You can keep journaling without a connection.'
            : 'You are offline. Changes are saved in this browser and sync when you reconnect.'
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
            label="Synchronization"
            value={
              status.syncing
                ? 'Syncing…'
                : status.conflicts
                  ? 'Needs review'
                  : status.pending
                    ? 'Changes pending'
                    : 'Up to date'
            }
            detail={
              unsynced
                ? `${unsynced} change${unsynced === 1 ? '' : 's'} in this browser only`
                : 'Everything is saved to your account'
            }
            icon={status.conflicts ? AlertTriangle : RefreshCw}
          />
          <OfflineStat
            label="Last sync"
            value={
              status.lastSyncAt
                ? formatDateTime(new Date(status.lastSyncAt))
                : 'Not yet'
            }
            detail={
              status.error && isOnline ? status.error : 'With your account'
            }
            icon={Clock3}
          />
          <OfflineStat
            label="Browser storage"
            value={usage ? formatBytes(usage.used, formatNumber) : '—'}
            detail={
              usage?.quota
                ? `of ${formatBytes(usage.quota, formatNumber)} available to this site`
                : 'Estimate unavailable'
            }
            icon={HardDrive}
          />
        </dl>
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isOnline || status.syncing}
            onClick={() =>
              void synchronizeEditionJournal().catch((error) =>
                toast.error(getErrorMessage(error, 'Could not sync')),
              )
            }
          >
            <RefreshCw aria-hidden="true" />
            Sync now
          </Button>
        </div>
        {legacyFailed ? (
          <p className="mt-4 text-sm text-destructive-text">
            {legacyFailed > 0
              ? `${legacyFailed} change${legacyFailed === 1 ? '' : 's'}`
              : 'Changes'}{' '}
            saved offline by an earlier version could not be moved into your
            journal. They remain in this browser’s storage.
          </p>
        ) : null}
      </PanelSection>

      <JournalSyncStatus />
      <PanelSection
        title="App shell"
        description="Re-download the cached application files. Your journal and pending changes are kept."
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
        title="Local data"
        description="This browser’s copy of your journal and its pictures. Your account keeps everything that has synced."
      >
        <DeleteConfirmation
          title="Remove this browser’s copy?"
          description="The journal downloads again from your account. Changes that have not synced would be lost, so this is only possible when everything is synced."
          confirmLabel="Remove local copy"
          busyLabel="Removing…"
          trigger={
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={unsynced > 0 || !isOnline || status.syncing}
            >
              <Trash2 aria-hidden="true" />
              Remove local copy
            </Button>
          }
          onConfirm={handleClear}
        />
      </PanelSection>
    </>
  )
}
