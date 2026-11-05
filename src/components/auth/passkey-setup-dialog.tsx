import { KeyRound, LoaderCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { authClient } from '@/lib/auth-client'
import { dismissPasskeySetupOffer } from '@/lib/server/passkey-prompt'

export function PasskeySetupDialog({
  onContinue,
}: {
  readonly onContinue: () => void
}) {
  const [activity, setActivity] = useState<'setup' | 'dismiss' | null>(null)
  const [error, setError] = useState('')
  const nextTimeButton = useRef<HTMLButtonElement>(null)
  const busy = activity !== null

  async function setup() {
    setActivity('setup')
    setError('')
    try {
      const result = await authClient.passkey.addPasskey()
      if (result.error)
        throw new Error(
          'Passkey setup was not completed. Try again or choose Next time.',
        )
      onContinue()
    } catch {
      setError(
        'Passkey setup was not completed. Try again or choose Next time.',
      )
      setActivity(null)
    }
  }

  async function dismiss() {
    setActivity('dismiss')
    setError('')
    try {
      await dismissPasskeySetupOffer()
      onContinue()
    } catch {
      setError(
        'Could not save your preference. Try again, or choose Next time to continue.',
      )
      setActivity(null)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onContinue()
      }}
    >
      <DialogContent showCloseButton={false} initialFocus={nextTimeButton}>
        <DialogHeader className="pr-5 sm:pr-6">
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl border border-border bg-secondary text-link">
            <KeyRound aria-hidden className="size-6" />
          </div>
          <DialogTitle>Make your next sign-in easier</DialogTitle>
          <DialogDescription>
            You’re signed in. Add a passkey to use your fingerprint, face,
            device PIN, or security key next time, without waiting for an email.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-muted-foreground">
            Choose No thanks to stop these reminders. You can always add a
            passkey later in Account settings.
          </p>
          {error ? (
            <p role="alert" className="mt-4 text-sm text-destructive-text">
              {error}
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => void dismiss()}
          >
            {activity === 'dismiss' ? 'Saving…' : 'No thanks'}
          </Button>
          <Button
            ref={nextTimeButton}
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onContinue}
          >
            Next time
          </Button>
          <Button type="button" disabled={busy} onClick={() => void setup()}>
            {activity === 'setup' ? (
              <LoaderCircle
                aria-hidden
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <KeyRound aria-hidden />
            )}
            {activity === 'setup' ? 'Setting up…' : 'Set up'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
