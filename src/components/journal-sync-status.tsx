import { Button } from '@roastbook/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@roastbook/ui/dialog'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import type { PendingChange } from '@/journal/local/sync'
import { useSyncStatus } from '@/journal/local/sync-status'
import { getErrorMessage } from '@/lib/error-message'

// The journal runtime loads in its own chunk.
async function loadSync() {
  // knip 6.45 loses members of a module destructured straight from Promise.all.
  const syncModule = import('@/journal/local/sync')
  const [{ openEditionJournal }, sync] = await Promise.all([
    import('@/journal/local/edition'),
    syncModule,
  ])
  return { journal: await openEditionJournal(), sync }
}

/** Changes saved in this browser that the server has not confirmed yet. */
export function JournalSyncStatus() {
  const status = useSyncStatus()
  const [changes, setChanges] = useState<PendingChange[] | 'failed'>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload when the counts change, so resolved changes leave the list
  useEffect(() => {
    if (!open) return
    void loadSync()
      .then(async ({ journal, sync }) => sync.listPendingChanges(journal))
      .then(setChanges)
      .catch(() => setChanges('failed'))
  }, [open, status.pending, status.conflicts])

  if (!status.pending && !status.conflicts && !status.authRequired) return null

  async function resolve(change: PendingChange, action: 'retry' | 'discard') {
    setBusy(true)
    try {
      const { journal, sync } = await loadSync()
      if (action === 'retry') await sync.retryChange(journal, change.seq)
      else await sync.discardChange(journal, change.seq)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Your changes are still saved.'))
    } finally {
      setBusy(false)
    }
  }

  const total = status.pending + status.conflicts
  return (
    <aside
      className="border-b border-border bg-secondary px-4 py-2 text-secondary-foreground"
      aria-label="Journal synchronization"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 text-sm">
        <p role="status">
          {status.authRequired
            ? 'Sign in again to sync the changes saved in this browser.'
            : status.conflicts
              ? `${status.conflicts} change${status.conflicts === 1 ? '' : 's'} could not be saved to your account.`
              : `${total} change${total === 1 ? '' : 's'} saved in this browser${status.syncing ? ', syncing…' : ', waiting to sync.'}`}
        </p>
        {status.authRequired ? (
          <Button variant="link" size="sm" render={<Link to="/login" />}>
            Sign in
          </Button>
        ) : null}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="link" size="sm" />}>
            Review changes
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Changes in this browser</DialogTitle>
              <DialogDescription>
                Changes stay here until your account confirms them. A change
                that no longer fits your journal, for example because it was
                edited on another device, needs your decision.
              </DialogDescription>
            </DialogHeader>
            {changes === 'failed' ? (
              <p className="text-sm text-destructive-text" role="alert">
                The saved changes could not be read. Reload the page to try
                again; they stay saved in this browser.
              </p>
            ) : null}
            <ul className="space-y-2 text-sm">
              {(changes === 'failed' ? [] : changes).map((change) => (
                <li key={change.seq} className="rounded-md border p-3">
                  <p className="font-medium">{describe(change.name)}</p>
                  <p className="text-muted-foreground">
                    {change.status === 'conflict'
                      ? change.error
                      : 'Waiting to sync'}
                  </p>
                  {change.status === 'conflict' ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void resolve(change, 'retry')}
                      >
                        Try again
                      </Button>
                      <DeleteConfirmation
                        title="Discard this change?"
                        description="Your journal returns to the version saved in your account. This browser's version of the change is removed."
                        confirmLabel="Discard change"
                        onConfirm={() => resolve(change, 'discard')}
                        trigger={
                          <Button size="sm" variant="outline" disabled={busy}>
                            Discard
                          </Button>
                        }
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  )
}

/** `beans/createBean` → "Create bean"; shots are brews to users. */
function describe(name: string) {
  const action = name.split('/')[1] ?? name
  const words = action
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/\bshot(s?)\b/g, 'brew$1')
    .replace(/\bentity /g, '')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
