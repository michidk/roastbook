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

type FlowProps = {
  readonly action: ReauthenticationAction
  readonly email: string
  readonly userId: string
  readonly onConfirmed: (token: string | undefined) => void
}

async function signInWithPasskey() {
  const result = await authClient.signIn.passkey()
  if (result.error)
    throw new Error('Your passkey was not confirmed. Try again or use email.')
}

async function emailCode(email: string) {
  const result = await authClient.emailOtp.sendVerificationOtp({
    email,
    type: 'sign-in',
  })
  if (result.error)
    throw new Error(result.error.message ?? 'Could not send your code')
}

async function signInWithCode(email: string, otp: string) {
  const result = await authClient.signIn.emailOtp({ email, otp })
  if (result.error)
    throw new Error(result.error.message ?? 'This code is invalid or expired')
}

/** Seconds until another code may be sent. */
function useResendCountdown(active: boolean) {
  const [sentAt, setSentAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active])
  return {
    seconds: Math.max(0, Math.ceil((sentAt + RESEND_DELAY_MS - now) / 1000)),
    restart() {
      const time = Date.now()
      setSentAt(time)
      setNow(time)
    },
  }
}

/** The confirmation's sign-in: a passkey, or an emailed code. */
function useReauthenticationFlow({
  action,
  email,
  userId,
  onConfirmed,
}: FlowProps) {
  const [step, setStep] = useState<'choose' | 'code'>('choose')
  const [code, setCode] = useState('')
  const countdown = useResendCountdown(step === 'code')
  const [busy, setBusy] = useState<'passkey' | 'sending' | 'verifying' | null>(
    null,
  )
  const [error, setError] = useState('')

  /** Runs one sign-in attempt; a failure keeps the dialog open with a reason. */
  async function attempt(
    kind: NonNullable<typeof busy>,
    fallback: string,
    work: () => Promise<void>,
  ) {
    setBusy(kind)
    setError('')
    try {
      await work()
    } catch (cause) {
      setError(getErrorMessage(cause, fallback))
    } finally {
      setBusy(null)
    }
  }

  /** The fresh sign-in is exchanged for this action's confirmation. */
  async function finish() {
    // The server also checks the sign-in belongs to this account, so a
    // passkey of another account cannot confirm, even for email changes.
    onConfirmed(await confirmReauthentication({ data: { action, userId } }))
  }

  return {
    step,
    code,
    busy,
    error,
    resendIn: countdown.seconds,
    setCode(value: string) {
      setCode(value)
      setError('')
    },
    confirmWithPasskey: () =>
      attempt('passkey', 'Could not use your passkey', async () => {
        await signInWithPasskey()
        await finish()
      }),
    sendCode: () =>
      attempt('sending', 'Could not send your code', async () => {
        await emailCode(email)
        countdown.restart()
        setCode('')
        setStep('code')
      }),
    verifyCode: (event: FormEvent) => {
      event.preventDefault()
      if (code.length !== SIGN_IN_CODE_LENGTH) return
      return attempt('verifying', 'Could not confirm your code', async () => {
        await signInWithCode(email, code)
        await finish()
      })
    },
  }
}

type Flow = ReturnType<typeof useReauthenticationFlow>

function ReauthenticationDialog({
  onCancel,
  ...props
}: FlowProps & { readonly onCancel: () => void }) {
  const flow = useReauthenticationFlow(props)
  return (
    <Dialog open onOpenChange={(open) => !open && !flow.busy && onCancel()}>
      <DialogContent showCloseButton={!flow.busy}>
        <form
          onSubmit={(event) => void flow.verifyCode(event)}
          className="contents"
        >
          <DialogHeader>
            <DialogTitle>Confirm it’s you</DialogTitle>
            <DialogDescription>
              To {REAUTHENTICATION_ACTIONS[props.action]}, sign in again. This
              confirmation is for this action only.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {flow.step === 'choose' ? (
              <MethodChoice flow={flow} email={props.email} />
            ) : (
              <CodeEntry flow={flow} email={props.email} />
            )}
            {flow.error ? (
              <p
                id="reauthentication-error"
                role="alert"
                className="text-sm text-destructive-text"
              >
                {flow.error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={flow.busy !== null}
              onClick={onCancel}
            >
              Cancel
            </Button>
            {flow.step === 'code' ? (
              <Button
                type="submit"
                disabled={
                  flow.busy !== null || flow.code.length !== SIGN_IN_CODE_LENGTH
                }
              >
                {flow.busy === 'verifying' ? 'Confirming…' : 'Confirm'}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MethodChoice({
  flow,
  email,
}: {
  readonly flow: Flow
  readonly email: string
}) {
  const passkeys =
    typeof window !== 'undefined' && Boolean(window.PublicKeyCredential)
  return (
    <div className="grid gap-2">
      {passkeys ? (
        <Button
          type="button"
          disabled={flow.busy !== null}
          onClick={() => void flow.confirmWithPasskey()}
        >
          <KeyRound aria-hidden="true" />
          {flow.busy === 'passkey' ? 'Waiting for passkey…' : 'Use a passkey'}
        </Button>
      ) : null}
      <Button
        type="button"
        variant={passkeys ? 'outline' : 'default'}
        disabled={flow.busy !== null}
        onClick={() => void flow.sendCode()}
      >
        <Mail aria-hidden="true" />
        {flow.busy === 'sending' ? 'Sending…' : 'Email me a code'}
      </Button>
      <p className="text-sm text-muted-foreground">The code goes to {email}.</p>
    </div>
  )
}

function CodeEntry({
  flow,
  email,
}: {
  readonly flow: Flow
  readonly email: string
}) {
  return (
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
        value={flow.code}
        onChange={flow.setCode}
        autoFocus
        aria-invalid={flow.error ? true : undefined}
        aria-describedby={flow.error ? 'reauthentication-error' : undefined}
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
        disabled={flow.busy !== null || flow.resendIn > 0}
        onClick={() => void flow.sendCode()}
      >
        {flow.resendIn > 0 ? `Resend code in ${flow.resendIn}s` : 'Resend code'}
      </Button>
    </div>
  )
}
