import { useEffect, useRef, useState } from 'react'
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
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import {
  dismissPendingShottimerShot,
  getPendingShottimerShot,
  reportShottimerTarget,
} from '@/lib/server/shottimer'
import type { ShottimerShot } from '@/lib/shottimer'

const POLL_INTERVAL_MS = 3000
const TARGET_REPORT_DELAY_MS = 500

/**
 * Polls for brew times sent by the shottimer device, offers each one in a
 * dialog, and shares this page's target time with the device.
 */
export function ShottimerShotDialog({
  targetTimeSeconds,
  onAccept,
}: {
  readonly targetTimeSeconds: string
  readonly onAccept: (seconds: string) => void
}) {
  const formatNumber = useNumberFormatter()
  const [shot, setShot] = useState<ShottimerShot | null>(null)
  // Keeps a handled shot hidden even if clearing it on the server failed.
  const handledAt = useRef<string | null>(null)
  const target = Number(targetTimeSeconds) || null

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      if (document.hidden) return
      try {
        const pending = await getPendingShottimerShot()
        if (!cancelled && pending && pending.receivedAt !== handledAt.current)
          setShot(pending)
      } catch {
        // A transient failure is retried by the next poll.
      }
    }
    void poll()
    const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(
      () => void reportShottimerTarget({ data: target }).catch(() => {}),
      TARGET_REPORT_DELAY_MS,
    )
    return () => window.clearTimeout(timeout)
  }, [target])

  const close = (receivedAt: string) => {
    handledAt.current = receivedAt
    setShot(null)
    void dismissPendingShottimerShot({ data: receivedAt }).catch(() => {})
  }

  return (
    <AlertDialog
      open={shot !== null}
      onOpenChange={(open) => {
        if (!open && shot) close(shot.receivedAt)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>New brew time from shottimer</AlertDialogTitle>
          <AlertDialogDescription>
            Use{' '}
            <strong className="font-semibold text-foreground tabular-nums">
              {shot ? formatNumber(String(shot.seconds)) : ''} s
            </strong>{' '}
            as the brew time?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Dismiss</AlertDialogCancel>
          <Button
            onClick={() => {
              if (!shot) return
              onAccept(String(shot.seconds))
              close(shot.receivedAt)
            }}
          >
            Use brew time
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
