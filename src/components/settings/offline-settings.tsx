import {
  AlertTriangle,
  Clock3,
  HardDrive,
  RefreshCw,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { JournalSyncStatus } from '@/components/journal-sync-status'
import { PanelSection } from '@/components/section-layout'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { usePwaMode } from '@/hooks/use-pwa-mode'
import { keepsDeviceCopy, setDeviceCopy } from '@/journal/local/device-copy'
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
  const [keep, setKeep] = useState(keepsDeviceCopy)
  const [isChanging, setIsChanging] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const installed = usePwaMode()

  useEffect(() => {
    void navigator.storage
      ?.estimate()
      .then((estimate) =>
        setUsage({ used: estimate.usage ?? 0, quota: estimate.quota ?? 0 }),
      )
      .catch(() => undefined)
    if (!keep) return
    void import('@/journal/local/edition')
      .then(({ openEditionJournal }) => openEditionJournal())
      .then((journal) => journal.getState<number>('legacyFailed'))
      .then((failed) => setLegacyFailed(failed ?? 0))
      .catch(() => undefined)
  }, [keep])

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

  // Keeping a copy downloads the journal once; dropping it needs a synced journal.
  const changeDeviceCopy = async (next: boolean) => {
    setIsChanging(true)
    try {
      const [{ openEditionJournal }, { deleteLocalJournal }, sync] =
        await Promise.all([
          import('@/journal/local/edition'),
          import('@/journal/local/client'),
          import('@/journal/local/sync'),
        ])
      const journal = await openEditionJournal()
      if (next) {
        setDeviceCopy(true)
        setKeep(true)
        toast.success('Your journal is now kept on this device.')
        return
      }
      if ((await sync.listPendingChanges(journal)).length)
        throw new Error('Sync or discard the changes on this device first.')
      await deleteLocalJournal(journal)
      setDeviceCopy(false)
      toast.success('This device no longer keeps a copy of your journal.')
      window.location.reload()
    } catch (error) {
      toast.error(
        getErrorMessage(error, 'Could not change this device’s journal copy'),
      )
    } finally {
      setIsChanging(false)
    }
  }
  const sync = () =>
    void import('@/journal/local/edition')
      .then(({ synchronizeEditionJournal }) => synchronizeEditionJournal())
      .catch((error) => toast.error(getErrorMessage(error, 'Could not sync')))

  return (
    <>
      <PanelSection
        title="Offline"
        description={
          !keep
            ? 'This browser reads and writes your journal on the server and keeps no copy. Keep a copy to use Roastbook offline; the installed app always keeps one.'
            : isOnline
              ? 'Your journal is kept on this device and syncs with your account. You can keep journaling without a connection.'
              : 'You are offline. Changes are saved on this device and sync when you reconnect.'
        }
        action={
          isOnline ? (
            <Wifi className="size-5 text-link" />
          ) : (
            <WifiOff className="size-5 text-destructive-text" />
          )
        }
      >
        <div className="flex items-center justify-between gap-4 rounded-xl bg-secondary/40 p-4">
          <div className="space-y-1">
            <Label id="device-copy-label" htmlFor="device-copy">
              Keep this journal on this device
            </Label>
            <p className="text-sm text-muted-foreground">
              {installed
                ? 'The installed app always keeps a copy for offline use.'
                : keep
                  ? 'Turning this off removes the copy once everything has synced.'
                  : 'Downloads your journal records once; pictures load as you view them.'}
            </p>
          </div>
          <Switch
            id="device-copy"
            aria-labelledby="device-copy-label"
            checked={keep}
            disabled={
              installed ||
              isChanging ||
              !isOnline ||
              (keep && (unsynced > 0 || status.syncing))
            }
            onCheckedChange={(checked) =>
              checked ? void changeDeviceCopy(true) : setConfirmRemove(true)
            }
          />
        </div>
        <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this device’s copy?</AlertDialogTitle>
              <AlertDialogDescription>
                Everything is synced, so your account keeps it all. This browser
                then needs a connection to use Roastbook.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isChanging}>
                Cancel
              </AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={isChanging}
                aria-busy={isChanging}
                onClick={() => void changeDeviceCopy(false)}
              >
                {isChanging ? 'Removing…' : 'Remove copy'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {keep ? (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
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
                onClick={sync}
              >
                <RefreshCw aria-hidden="true" />
                Sync now
              </Button>
            </div>
          </>
        ) : null}
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

      {keep ? <JournalSyncStatus /> : null}
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
    </>
  )
}
