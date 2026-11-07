import { Button } from '@roastbook/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@roastbook/ui/card'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ReauthenticationDialog } from '@/components/auth/reauthentication-dialog'
import { ScopePicker } from '@/components/settings/scope-picker'
import {
  approveOAuthConsentAccess,
  denyOAuthConsent,
  getOAuthConsent,
} from '@/lib/server/oauth'
import type { IntegrationScope } from '@/modules/integrations/scopes'

export const Route = createFileRoute('/oauth/consent')({
  loader: () =>
    getOAuthConsent({
      data: {
        query:
          typeof window === 'undefined'
            ? undefined
            : window.location.search.slice(1),
      },
    }),
  component: ConsentPage,
})
function ConsentPage() {
  const grant = Route.useLoaderData()
  const [reauthToken, setReauthToken] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [access, setAccess] = useState<IntegrationScope[]>(grant.approvedAccess)
  async function consent(accept: boolean) {
    setBusy(true)
    setError('')
    try {
      const query = window.location.search.slice(1)
      const result = accept
        ? await approveOAuthConsentAccess({
            data: {
              query,
              scopes: access,
              reauthToken: reauthToken ?? undefined,
            },
          })
        : await denyOAuthConsent({ data: { query } })
      if (result.url) window.location.assign(result.url)
      else throw new Error('Start authorization again from your application')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authorization failed')
      setBusy(false)
      if (accept) setReauthToken(null)
    }
  }
  return (
    <div className="flex min-h-[80dvh] items-center justify-center px-4 py-8">
      {confirming && !reauthToken ? (
        <ReauthenticationDialog
          action="connect-application"
          email={grant.email}
          userId={grant.userId}
          onConfirmed={(token) => {
            if (token) {
              setReauthToken(token)
              setConfirming(false)
            }
          }}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Connect an application</CardTitle>
          <p className="text-sm text-muted-foreground">
            Signed in as {grant.email}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="font-semibold break-words">{grant.clientName}</p>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {grant.clientId}
            </p>
          </div>
          <p>
            This application is asking to access your private coffee journal.
          </p>
          {reauthToken ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Allow it to</p>
              <ScopePicker
                id="consent-scopes"
                value={access}
                allowed={grant.allowedAccess}
                onChange={setAccess}
                disabled={busy}
              />
            </div>
          ) : (
            <p>
              Confirm it’s you before choosing this application’s permissions.
            </p>
          )}
          {grant.scopes.includes('offline_access') ? (
            <p className="text-sm">
              It stays connected when you are signed out, until you disconnect
              it or its authorization expires.
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            It cannot administer accounts or read your AI provider key. Your MCP
            tool switches still apply. You can change its permissions or
            disconnect it in Settings → AI access (MCP).
          </p>
          <div className="text-sm">
            <p className="font-medium">Return address</p>
            <p className="break-all text-muted-foreground">
              {grant.redirectUri}
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {reauthToken ? (
              <Button
                disabled={busy || !access.length}
                onClick={() => void consent(true)}
              >
                Allow access
              </Button>
            ) : (
              <Button disabled={busy} onClick={() => setConfirming(true)}>
                Confirm it’s you
              </Button>
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void consent(false)}
            >
              Deny
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
