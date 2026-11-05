import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { KeyRound, Mail } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { useAppSettings } from '@/hooks/use-app-settings'
import { authClient } from '@/lib/auth-client'
import { getErrorMessage } from '@/lib/error-message'
import { confirmReauthentication } from '@/lib/server/reauthentication'
import {
  REAUTHENTICATION_ACTIONS,
  type ReauthenticationAction,
  SESSION_ONLY_ACTIONS,
} from '@/modules/auth/reauthentication'
import { SIGN_IN_CODE_LENGTH } from '@/modules/auth/sign-in-link'
import { RESEND_DELAY_MS } from './login-state'

export class ReauthenticationCancelledError extends Error {
  constructor() {
    super('Confirmation cancelled')
    this.name = 'ReauthenticationCancelledError'
  }
}

/** Callers stay quiet when the owner closes the confirmation. */
export function isReauthenticationCancelled(error: unknown) {
  return error instanceof ReauthenticationCancelledError
}

type Request = {
  action: ReauthenticationAction
  resolve: (token: string | undefined) => void
  reject: (error: Error) => void
}

/**
 * Asks the owner to sign in again before one sensitive action and returns the
 * single-use confirmation for it. Without built-in accounts there is nothing
 * to confirm and `confirm` resolves to undefined.
 */
export function useReauthentication() {
  const { account } = useAppSettings()
  const [request, setRequest] = useState<Request | null>(null)
  const confirm = useCallback(
    (action: ReauthenticationAction): Promise<string | undefined> =>
      account
        ? new Promise<string | undefined>((resolve, reject) =>
            setRequest({ action, resolve, reject }),
          )
        : Promise.resolve(undefined),
    [account],
  )
  const dialog =
    request && account ? (
      <ReauthenticationDialog
        action={request.action}
        email={account.email}
        userId={account.id}
        onConfirmed={(token) => {
          request.resolve(token)
          setRequest(null)
        }}
        onCancel={() => {
          request.reject(new ReauthenticationCancelledError())
          setRequest(null)
        }}
      />
    ) : null
  return { confirm, dialog }
}

function ReauthenticationDialog({
  action,
  email,
  userId,
  onConfirmed,
  onCancel,
}: {
  readonly action: ReauthenticationAction
  readonly email: string
  readonly userId: string
  readonly onConfirmed: (token: string | undefined) => void
  readonly onCancel: () => void
}) {
  const [step, setStep] = useState<'choose' | 'code'>('choose')
  const [code, setCode] = useState('')
  const [sentAt, setSentAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState<'passkey' | 'sending' | 'verifying' | null>(
    null,
  )
  const [error, setError] = useState('')
  const passkeys =
    typeof window !== 'undefined' && Boolean(window.PublicKeyCredential)
  const resendIn = Math.max(
    0,
    Math.ceil((sentAt + RESEND_DELAY_MS - now) / 1000),
  )

  useEffect(() => {
    if (step !== 'code') return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [step])

  /** The fresh sign-in is exchanged for this action's confirmation. */
  async function finish() {
    onConfirmed(
      SESSION_ONLY_ACTIONS.has(action)
        ? undefined
        : await confirmReauthentication({ data: { action, userId } }),
    )
  }

  async function confirmWithPasskey() {
    setBusy('passkey')
    setError('')
    try {
      const result = await authClient.signIn.passkey()
      if (result.error)
        throw new Error(
          'Your passkey was not confirmed. Try again or use email.',
        )
      await finish()
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not use your passkey'))
      setBusy(null)
    }
  }

  async function sendCode() {
    setBusy('sending')
    setError('')
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'sign-in',
      })
      if (result.error)
        throw new Error(result.error.message ?? 'Could not send your code')
      const time = Date.now()
      setSentAt(time)
      setNow(time)
      setCode('')
      setStep('code')
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not send your code'))
    } finally {
      setBusy(null)
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault()
    if (code.length !== SIGN_IN_CODE_LENGTH) return
    setBusy('verifying')
    setError('')
    try {
      const result = await authClient.signIn.emailOtp({ email, otp: code })
      if (result.error)
        throw new Error(
          result.error.message ?? 'This code is invalid or expired',
        )
      await finish()
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not confirm your code'))
      setBusy(null)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent showCloseButton={!busy}>
        <form onSubmit={(event) => void verifyCode(event)} className="contents">
          <DialogHeader>
            <DialogTitle>Confirm it’s you</DialogTitle>
            <DialogDescription>
              To {REAUTHENTICATION_ACTIONS[action]}, sign in again. This
              confirmation is for this action only.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {step === 'choose' ? (
              <div className="grid gap-2">
                {passkeys ? (
                  <Button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void confirmWithPasskey()}
                  >
                    <KeyRound aria-hidden="true" />
                    {busy === 'passkey'
                      ? 'Waiting for passkey…'
                      : 'Use a passkey'}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant={passkeys ? 'outline' : 'default'}
                  disabled={busy !== null}
                  onClick={() => void sendCode()}
                >
                  <Mail aria-hidden="true" />
                  {busy === 'sending' ? 'Sending…' : 'Email me a code'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  The code goes to {email}.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="reauthentication-code">
                  {SIGN_IN_CODE_LENGTH}-digit code sent to {email}
                </Label>
                <InputOTP
                  id="reauthentication-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern={REGEXP_ONLY_DIGITS}
                  maxLength={SIGN_IN_CODE_LENGTH}
                  pasteTransformer={(value) => value.replace(/\D/g, '')}
                  value={code}
                  onChange={(value) => {
                    setCode(value)
                    if (error) setError('')
                  }}
                  autoFocus
                  aria-invalid={error ? true : undefined}
                  aria-describedby={
                    error ? 'reauthentication-error' : undefined
                  }
                  containerClassName="w-full justify-center gap-2"
                >
                  <InputOTPGroup aria-hidden="true">
                    {[0, 1, 2].map((index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                  <InputOTPSeparator
                    aria-hidden="true"
                    className="w-2 justify-center text-muted-foreground"
                  />
                  <InputOTPGroup aria-hidden="true">
                    {[3, 4, 5].map((index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0"
                  disabled={busy !== null || resendIn > 0}
                  onClick={() => void sendCode()}
                >
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </Button>
              </div>
            )}
            {error ? (
              <p
                id="reauthentication-error"
                role="alert"
                className="text-sm text-destructive-text"
              >
                {error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={onCancel}
            >
              Cancel
            </Button>
            {step === 'code' ? (
              <Button
                type="submit"
                disabled={busy !== null || code.length !== SIGN_IN_CODE_LENGTH}
              >
                {busy === 'verifying' ? 'Confirming…' : 'Confirm'}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
