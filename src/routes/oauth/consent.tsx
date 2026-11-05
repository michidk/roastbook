import { Button } from '@roastbook/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@roastbook/ui/card'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ScopePicker } from '@/components/settings/scope-picker'
import { authClient } from '@/lib/auth-client'
import { approveOAuthConsentAccess, getOAuthConsent } from '@/lib/server/oauth'
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [access, setAccess] = useState<IntegrationScope[]>(grant.approvedAccess)
  async function consent(accept: boolean) {
    setBusy(true)
    setError('')
    try {
      if (accept)
        await approveOAuthConsentAccess({
          data: { query: window.location.search.slice(1), scopes: access },
        })
      const result = await authClient.oauth2.consent({ accept })
      if (result.error)
        throw new Error(
          result.error.message ?? 'Could not authorize this application',
        )
      if (result.data?.url) window.location.assign(result.data.url)
      else throw new Error('Start authorization again from your application')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authorization failed')
      setBusy(false)
    }
  }
  return (
    <div className="flex min-h-[80dvh] items-center justify-center px-4 py-8">
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
            <Button
              disabled={busy || !access.length}
              onClick={() => void consent(true)}
            >
              Allow access
            </Button>
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
