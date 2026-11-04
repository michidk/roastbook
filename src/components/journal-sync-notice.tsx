import type { JournalState } from '@roastbook/journal-domain/state'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  getClientJournal,
  subscribeJournalChanges,
  synchronizeJournal,
} from '@/lib/client/local-journal'
import { getErrorMessage } from '@/lib/error-message'

export function JournalSyncNotice() {
  const [state, setState] = useState<JournalState | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let disposed = false
    const refresh = () => {
      void getClientJournal()
        .then((journal) => journal.read())
        .then((value) => {
          if (!disposed) setState(value)
        })
        .catch(() => undefined)
    }
    refresh()
    const unsubscribe = subscribeJournalChanges(refresh)
    return () => {
      disposed = true
      unsubscribe()
    }
  }, [])
  if (!state?.pending.length) return null
  const problem = state.pending.find((entry) => entry.status !== 'pending')
  async function resolve(action: 'retry' | 'reapply' | 'server') {
    setBusy(true)
    try {
      await (await getClientJournal()).resolvePending(action)
      await synchronizeJournal()
    } catch (error) {
      toast.error(
        getErrorMessage(error, 'Your changes are still saved on this device.'),
      )
    } finally {
      setBusy(false)
    }
  }
  function exportJournal() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'roastbook-local-journal.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <aside
      className="border-b border-border bg-secondary px-4 py-2 text-secondary-foreground"
      aria-label="Journal synchronization"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 text-sm">
        <p role="status">
          {state.pending.length} change{state.pending.length === 1 ? '' : 's'}{' '}
          saved on this device.{' '}
          {problem
            ? 'Sync needs attention.'
            : 'Waiting for server confirmation.'}
        </p>
        <Dialog>
          <DialogTrigger render={<Button variant="link" size="sm" />}>
            Review changes
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Changes on this device</DialogTitle>
              <DialogDescription>
                Changes remain here until the server confirms them. Download a
                copy before resolving a conflict.
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-2 text-sm">
              {state.pending.map((entry) => (
                <li key={entry.command.id} className="rounded-md border p-3">
                  <p>{entry.command.operation.split('/')[1]}</p>
                  <p className="text-muted-foreground">
                    {entry.error ?? 'Waiting to sync'}
                  </p>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportJournal}>
                Download local copy
              </Button>
              <Button disabled={busy} onClick={() => void resolve('retry')}>
                Retry sync
              </Button>
              {problem?.status === 'auth-required' ? (
                <Button asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
              ) : null}
              {problem?.status === 'conflict' ? (
                <DeleteConfirmation
                  title="Apply your changes to the latest journal?"
                  description="Your pending edits will take precedence over conflicting changes from another device. Other server records stay intact. Download a local copy first."
                  confirmLabel="Apply my changes"
                  onConfirm={() => resolve('reapply')}
                  trigger={
                    <Button variant="outline" disabled={busy}>
                      Apply my changes
                    </Button>
                  }
                />
              ) : null}
              {problem ? (
                <DeleteConfirmation
                  title="Discard this device’s pending changes?"
                  description="This replaces the local journal with the current server journal and removes all pending edits and local pictures. Download a local copy first."
                  confirmLabel="Use server journal"
                  onConfirm={() => resolve('server')}
                  trigger={
                    <Button variant="destructive" disabled={busy}>
                      Use server journal
                    </Button>
                  }
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  )
}
