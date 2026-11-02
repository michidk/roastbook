import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAppSettings } from '@/hooks/use-app-settings'
import type { getMcpAdminState } from '@/lib/mcp/settings'
import { disconnectOAuthGrant } from '@/lib/server/oauth'
import { IntegrationTokenControl } from './integration-token-control'
import { SettingsPanelSection } from './settings-shell'

type Grants = Awaited<ReturnType<typeof getMcpAdminState>>['grants']

export function McpConnections({ grants }: { readonly grants: Grants }) {
  const { account, demoMode } = useAppSettings()
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  async function disconnect(id: string) {
    setDisconnecting(id)
    try {
      await disconnectOAuthGrant({ data: { id } })
      await router.invalidate()
      toast.success('Application disconnected')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not disconnect the application',
      )
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <>
      {account ? (
        <SettingsPanelSection
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
                  <p className="mt-1 text-sm text-muted-foreground">
                    {grant.scopes.includes('mcp:write')
                      ? 'Read journal and log brews'
                      : 'Read journal'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disconnecting !== null}
                  onClick={() => void disconnect(grant.id)}
                >
                  {disconnecting === grant.id ? 'Disconnecting…' : 'Disconnect'}
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No applications connected. Add the MCP URL to your client and sign
              in to connect one.
            </p>
          )}
        </SettingsPanelSection>
      ) : null}
      {demoMode ? null : (
        <SettingsPanelSection
          title="MCP tokens"
          description="For clients without browser sign-in. Tokens allow all enabled MCP tools and expire after one year."
        >
          <IntegrationTokenControl kind="mcp" />
        </SettingsPanelSection>
      )}
    </>
  )
}
