import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const fields = new URLSearchParams(window.location.hash.slice(1))
    const address = fields.get('email'),
      otp = fields.get('code')
    if (address && otp) {
      setEmail(address)
      setCode(otp)
      setSent(true)
    }
    window.history.replaceState(null, '', `/login${window.location.search}`)
  }, [])
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (!sent) {
        const result = await authClient.emailOtp.sendVerificationOtp({
          email: email.trim(),
          type: 'sign-in',
        })
        if (result.error)
          throw new Error(
            result.error.message ?? 'Could not send a sign-in email',
          )
        setSent(true)
      } else {
        const result = await authClient.signIn.emailOtp({
          email: email.trim(),
          otp: code,
        })
        if (result.error)
          throw new Error(
            result.error.message ?? 'This code is invalid or expired',
          )
        window.location.assign(
          result.data &&
            'url' in result.data &&
            typeof result.data.url === 'string'
            ? result.data.url
            : '/overview',
        )
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }
  async function signInPasskey() {
    setBusy(true)
    try {
      const result = await authClient.signIn.passkey()
      if (result.error)
        throw new Error(result.error.message ?? 'Passkey sign-in failed')
      window.location.assign(
        result.data &&
          'url' in result.data &&
          typeof result.data.url === 'string'
          ? result.data.url
          : '/overview',
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Passkey sign-in failed',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex min-h-[80dvh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to Roastbook</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your coffee journal, privately yours. Use an email code or a
            passkey.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                readOnly={sent}
                disabled={busy}
              />
            </div>
            {sent ? (
              <div className="space-y-2">
                <Label htmlFor="code">Sign-in code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  disabled={busy}
                />
                <p className="text-sm text-muted-foreground">
                  Check your email for an eight-digit code. It expires in 10
                  minutes.
                </p>
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy
                ? 'Please wait…'
                : sent
                  ? 'Confirm sign-in'
                  : 'Email me a code'}
            </Button>
            {sent ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={busy}
                onClick={() => {
                  setSent(false)
                  setCode('')
                  setError('')
                }}
              >
                Use another email or request a new code
              </Button>
            ) : null}
          </form>
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={signInPasskey}
          >
            Sign in with a passkey
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
