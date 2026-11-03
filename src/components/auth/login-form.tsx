import { REGEXP_ONLY_DIGITS } from 'input-otp'
import {
  AlertCircle,
  ArrowRight,
  KeyRound,
  LoaderCircle,
  Mail,
  MailCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { SIGN_IN_CODE_LENGTH } from '@/modules/auth/sign-in-link'
import { PasskeySetupDialog } from './passkey-setup-dialog'
import { useLoginForm } from './use-login-form'

export function LoginForm() {
  const login = useLoginForm()
  const { step, ready, activity, busy, error, remaining } = login
  const label = !ready
    ? 'Loading sign-in…'
    : activity === 'sending'
      ? 'Sending your email…'
      : activity === 'verifying'
        ? 'Signing you in…'
        : step.kind === 'email'
          ? 'Send sign-in email'
          : step.kind === 'confirm'
            ? 'Confirm sign-in'
            : 'Sign in'

  return (
    <Card className="w-full gap-7 py-7 [--card-spacing:--spacing(7)] sm:py-9 sm:[--card-spacing:--spacing(9)]">
      <CardHeader className="gap-3">
        {step.kind !== 'email' ? (
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl border border-border bg-secondary text-link">
            <MailCheck aria-hidden className="size-6" />
          </div>
        ) : null}
        <CardTitle
          as="h1"
          className="text-[1.875rem] leading-tight font-extrabold"
        >
          {step.kind === 'email'
            ? 'Welcome to Roastbook'
            : step.kind === 'confirm'
              ? 'Your journal is one click away'
              : 'Check your inbox'}
        </CardTitle>
        <div className="text-base leading-relaxed text-muted-foreground">
          {step.kind === 'email' ? (
            <p>Sign in to your private coffee journal. No password needed.</p>
          ) : (
            <>
              <p>
                {step.kind === 'confirm'
                  ? 'Continue as'
                  : 'We sent a sign-in link and code to'}
              </p>
              <p className="mt-1 break-all font-semibold text-foreground">
                {step.email}
              </p>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={login.submit} aria-busy={busy}>
          <fieldset disabled={!ready || busy} className="min-w-0 space-y-5">
            <legend className="sr-only">Passwordless sign-in</legend>
            {step.kind === 'email' ? (
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    ref={login.emailInput}
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="you@example.com"
                    maxLength={320}
                    required
                    value={step.email}
                    onChange={(event) => login.setEmail(event.target.value)}
                    aria-describedby="email-help"
                    className="pl-10 [@media(hover:hover)_and_(pointer:fine)]:h-12 md:text-base"
                  />
                </div>
                <p
                  id="email-help"
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  We’ll email you a link and an 8-digit sign-in code.
                </p>
              </div>
            ) : step.kind === 'code' ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Open the link in your email, or enter your code here.
                </p>
                <Label htmlFor="code">8-digit sign-in code</Label>
                <InputOTP
                  ref={login.codeInput}
                  id="code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern={REGEXP_ONLY_DIGITS}
                  maxLength={SIGN_IN_CODE_LENGTH}
                  pasteTransformer={(value) => value.replace(/\D/g, '')}
                  required
                  value={step.code}
                  onChange={login.setCode}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={
                    error ? 'code-help login-error' : 'code-help'
                  }
                  containerClassName="w-full justify-center gap-2"
                >
                  <InputOTPGroup aria-hidden="true">
                    {[0, 1, 2, 3].map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        aria-invalid={!!error}
                      />
                    ))}
                  </InputOTPGroup>
                  <InputOTPSeparator
                    aria-hidden="true"
                    className="w-2 justify-center text-muted-foreground"
                  />
                  <InputOTPGroup aria-hidden="true">
                    {[4, 5, 6, 7].map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        aria-invalid={!!error}
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <p id="code-help" className="text-sm text-muted-foreground">
                  Your link and code expire in 10 minutes.
                </p>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Confirm below to finish signing in on this device.
              </p>
            )}
            {error ? (
              <div
                id="login-error"
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm leading-relaxed text-destructive-text"
              >
                <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={
                step.kind === 'code' && step.code.length !== SIGN_IN_CODE_LENGTH
              }
            >
              {activity === 'sending' || activity === 'verifying' ? (
                <LoaderCircle
                  aria-hidden
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : null}
              {label}
              {!busy && ready ? <ArrowRight aria-hidden /> : null}
            </Button>
            {step.kind !== 'email' ? (
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={login.changeEmail}
                  className="min-h-11 px-2 [@media(hover:hover)_and_(pointer:fine)]:h-11"
                >
                  Change email
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={remaining > 0}
                  onClick={() => void login.sendEmail(true)}
                  className="min-h-11 px-2 [@media(hover:hover)_and_(pointer:fine)]:h-11"
                >
                  {activity === 'resending'
                    ? 'Sending…'
                    : remaining > 0
                      ? `Resend in ${remaining}s`
                      : 'Resend email'}
                </Button>
              </div>
            ) : null}
          </fieldset>
        </form>
        {step.kind === 'email' ? (
          <>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>or</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2 text-center">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                disabled={!ready || busy}
                onClick={() => void login.signInPasskey()}
              >
                {activity === 'passkey' ? (
                  <LoaderCircle
                    aria-hidden
                    className="animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <KeyRound aria-hidden />
                )}
                {activity === 'passkey'
                  ? 'Waiting for your passkey…'
                  : 'Sign in with a passkey'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Already added a passkey? Use your device to sign in.
              </p>
            </div>
          </>
        ) : null}
        <noscript>
          <p role="alert">Enable JavaScript in your browser to sign in.</p>
        </noscript>
      </CardContent>
      {login.passkeyPromptOpen ? (
        <PasskeySetupDialog onContinue={login.continueAfterPasskey} />
      ) : null}
    </Card>
  )
}
