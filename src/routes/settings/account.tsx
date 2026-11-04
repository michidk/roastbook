import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { PanelSection } from '@/components/section-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { authClient } from '@/lib/auth-client'
import {
  confirmDeletion,
  getCurrentAccount,
  requestDeletion,
  requestExport,
} from '@/lib/server/account'
import { signOutOfAccount } from '@/lib/sign-out'

export const Route = createFileRoute('/settings/account')({
  loader: () => getCurrentAccount(),
  component: AccountPage,
})
function AccountPage() {
  const state = Route.useLoaderData(),
    router = useRouter()
  const formatDateTime = useDateTimeFormatter()
  const deletionInitialized = useRef(false)
  const [email, setEmail] = useState('')
  const [deletion, setDeletion] = useState('')
  const [busy, setBusy] = useState(false)
  const [passkeys, setPasskeys] = useState<
    Array<{ id: string; name?: string | null }>
  >([])
  const accountId = state.identity?.id
  useEffect(() => {
    if (!deletionInitialized.current) {
      deletionInitialized.current = true
      const fields = new URLSearchParams(window.location.hash.slice(1))
      setDeletion(fields.get('delete') ?? '')
      if (window.location.hash)
        window.history.replaceState(
          window.history.state,
          '',
          '/settings/account',
        )
    }
    if (!accountId) return
    void authClient.passkey.listUserPasskeys().then((result) => {
      if (result.data) setPasskeys(result.data)
    })
  }, [accountId])
  if (!state.identity)
    return <p>Account management is unavailable on this installation.</p>
  const identity = state.identity
  async function action(work: () => Promise<unknown>, message: string) {
    setBusy(true)
    try {
      await work()
      toast.success(message)
      await router.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The action failed')
    } finally {
      setBusy(false)
    }
  }
  async function checkResult(result: { error?: { message?: string } | null }) {
    if (result.error)
      throw new Error(result.error.message ?? 'The action failed')
  }
  return (
    <>
      <PanelSection
        title="Email address"
        description="Your email address is used for passwordless sign-in and account confirmations."
      >
        <p className="break-all font-medium">{identity.email}</p>
        <form
          className="max-w-md space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void action(
              async () =>
                checkResult(
                  await authClient.changeEmail({
                    newEmail: email,
                    callbackURL: '/settings/account',
                  }),
                ),
              'Check your current email to approve the change, then verify the new address.',
            )
          }}
        >
          <Label htmlFor="account-email">New email address</Label>
          <Input
            id="account-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Button disabled={busy} variant="outline">
            Change email
          </Button>
        </form>
      </PanelSection>
      <PanelSection
        title="Passkeys"
        description="Use your device or a security key to sign in without an email code."
      >
        <div className="space-y-3">
          {passkeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No passkeys added yet.
            </p>
          ) : null}
          {passkeys.map((key) => (
            <div
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <span>{key.name || 'Passkey'}</span>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() =>
                  void action(async () => {
                    await checkResult(
                      await authClient.passkey.deletePasskey({ id: key.id }),
                    )
                    setPasskeys((current) =>
                      current.filter((p) => p.id !== key.id),
                    )
                  }, 'Passkey removed')
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            disabled={busy}
            onClick={() =>
              void action(async () => {
                await checkResult(
                  await authClient.passkey.addPasskey({ name: 'My passkey' }),
                )
                const result = await authClient.passkey.listUserPasskeys()
                if (result.data) setPasskeys(result.data)
              }, 'Passkey added')
            }
          >
            Add a passkey
          </Button>
        </div>
      </PanelSection>
      <PanelSection
        title="Sessions"
        description="Sign out on this device or end your sessions on other devices."
      >
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={busy}
            variant="outline"
            onClick={() =>
              void action(
                async () => checkResult(await authClient.revokeOtherSessions()),
                'Other devices signed out',
              )
            }
          >
            Sign out other devices
          </Button>
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => void action(signOutOfAccount, 'Signed out')}
          >
            Sign out
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          For sensitive changes, sign in again if your session is older than 10
          minutes.
        </p>
      </PanelSection>
      <PanelSection
        title="Export your journal"
        description="Download your data and original stored images as a ZIP archive. Downloads expire after 24 hours."
      >
        <div className="space-y-3">
          <Button
            disabled={busy}
            onClick={() =>
              void action(
                () => requestExport(),
                'Export requested. Refresh this page to check progress.',
              )
            }
          >
            Request export
          </Button>
          {state.exports.map((job) => (
            <div key={job.id} className="flex flex-wrap items-center gap-3">
              <span>
                {formatDateTime(job.createdAt)} · {job.status}
              </span>
              {job.status === 'ready' ? (
                <a
                  className="text-link underline"
                  href={`/api/account/exports/${job.id}`}
                >
                  Download ZIP
                </a>
              ) : null}
            </div>
          ))}
          <Button variant="ghost" onClick={() => void router.invalidate()}>
            Refresh status
          </Button>
        </div>
      </PanelSection>
      {identity.role === 'admin' ? (
        <PanelSection
          title="Administration"
          description="Manage users and administrator access for this installation."
        >
          <Button
            variant="outline"
            render={<Link to="/admin/users" search={{ page: 0 }} />}
          >
            Manage users
          </Button>
        </PanelSection>
      ) : null}
      <PanelSection
        title="Delete your account"
        description="Permanently delete your journal and images. You must confirm through your email."
      >
        {deletion ? (
          <div className="space-y-3">
            <p role="alert">
              Confirm permanent deletion of your account, journal, and images.
              This cannot be undone.
            </p>
            <Button
              disabled={busy}
              variant="destructive"
              onClick={() =>
                void action(async () => {
                  await confirmDeletion({ data: { token: deletion } })
                  window.location.assign('/login')
                }, 'Account deletion confirmed')
              }
            >
              Permanently delete my account
            </Button>
            <Button variant="outline" onClick={() => setDeletion('')}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            disabled={busy}
            variant="destructive"
            onClick={() =>
              void action(
                () => requestDeletion(),
                'Check your email to confirm account deletion.',
              )
            }
          >
            Request account deletion
          </Button>
        )}
      </PanelSection>
    </>
  )
}
