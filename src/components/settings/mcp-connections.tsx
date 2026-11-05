import { Button } from '@roastbook/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@roastbook/ui/dialog'
import { useRouter } from '@tanstack/react-router'
import { type FormEvent, useId, useState } from 'react'
import { toast } from 'sonner'
import {
  isReauthenticationCancelled,
  useReauthentication,
} from '@/components/auth/reauthentication-dialog'
import { PanelSection } from '@/components/section-layout'
import { IntegrationKeys } from '@/components/settings/integration-keys'
import { ScopePicker } from '@/components/settings/scope-picker'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { getErrorMessage } from '@/lib/error-message'
import type { getMcpAdminState } from '@/lib/mcp/settings'
import {
  disconnectOAuthGrant,
  updateOAuthGrantPermissions,
} from '@/lib/server/oauth'
import {
  describeScopes,
  type IntegrationScope,
} from '@/modules/integrations/scopes'

type McpAdminState = Awaited<ReturnType<typeof getMcpAdminState>>
type Grant = McpAdminState['grants'][number]

export function McpConnections({
  grants,
  credentials,
}: {
  readonly grants: McpAdminState['grants']
  readonly credentials: McpAdminState['credentials']
}) {
  const { account, demoMode } = useAppSettings()
  const router = useRouter()
  const formatNumber = useNumberFormatter()
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [editing, setEditing] = useState<Grant | null>(null)

  async function disconnect(id: string) {
    setDisconnecting(id)
    try {
      await disconnectOAuthGrant({ data: { id } })
      await router.invalidate()
      toast.success('Application disconnected')
    } catch (error) {
      toast.error(
        getErrorMessage(error, 'Could not disconnect the application'),
      )
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <>
      {account ? (
        <PanelSection
          title="Connected applications"
          description="Applications you authorized through browser sign-in. Disconnecting immediately removes their access to your journal."
        >
          {grants.length ? (
            grants.map((grant) => (
              <div
                key={grant.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0 flex-1 basis-48">
                  <p className="break-words font-semibold">
                    {grant.name ?? 'Unnamed application'}
                  </p>
                  <p className="break-all text-xs text-muted-foreground">
                    {grant.clientId}
                  </p>
                  <p className="mt-1 text-sm">{describeScopes(grant.access)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(grant.requestsToday)} requests today
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disconnecting !== null}
                    onClick={() => setEditing(grant)}
                  >
                    Permissions
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disconnecting !== null}
                    onClick={() => void disconnect(grant.id)}
                  >
                    {disconnecting === grant.id
                      ? 'Disconnecting…'
                      : 'Disconnect'}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No applications connected. Add the MCP URL to your client and sign
              in to connect one.
            </p>
          )}
        </PanelSection>
      ) : null}
      {demoMode ? null : (
        <PanelSection
          title="MCP tokens"
          description="For clients without browser sign-in: send the token as Authorization: Bearer <token>. Tokens use the same permissions as API keys."
        >
          <IntegrationKeys
            kind="mcp"
            credentials={credentials}
            onChanged={() => router.invalidate()}
          />
        </PanelSection>
      )}
      {editing ? (
        <GrantPermissionsDialog
          grant={editing}
          onClose={() => setEditing(null)}
          onSaved={() => router.invalidate()}
        />
      ) : null}
    </>
  )
}

function GrantPermissionsDialog({
  grant,
  onClose,
  onSaved,
}: {
  readonly grant: Grant
  readonly onClose: () => void
  readonly onSaved: () => Promise<void>
}) {
  const id = useId()
  const [scopes, setScopes] = useState<IntegrationScope[]>(grant.access)
  const [busy, setBusy] = useState(false)
  const reauthentication = useReauthentication()

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const reauthToken = await reauthentication.confirm('change-permissions')
      setBusy(true)
      await updateOAuthGrantPermissions({
        data: { id: grant.id, scopes, reauthToken },
      })
      await onSaved()
      toast.success('Permissions saved. New requests use them immediately.')
      onClose()
    } catch (error) {
      if (isReauthenticationCancelled(error)) return
      toast.error(getErrorMessage(error, 'Could not save the permissions'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {reauthentication.dialog}
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <form onSubmit={(event) => void submit(event)} className="contents">
            <DialogHeader>
              <DialogTitle>
                Permissions for {grant.name ?? 'this application'}
              </DialogTitle>
              <DialogDescription>
                {grant.allowedAccess.some((scope) => scope.endsWith(':write'))
                  ? 'The application asked for read and write access; allow only what it needs.'
                  : 'The application asked for read access only. Reconnect it to grant write access.'}
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <ScopePicker
                id={`${id}-scopes`}
                value={scopes}
                allowed={grant.allowedAccess}
                onChange={setScopes}
                disabled={busy}
              />
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !scopes.length}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
