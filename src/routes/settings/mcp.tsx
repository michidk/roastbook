import { createFileRoute } from '@tanstack/react-router'
import { DemoIntegrationNotice } from '@/components/edition-ui'
import { PanelPending } from '@/components/route-pending'
import { McpSettings } from '@/components/settings/mcp-settings'
import { DEMO_MODE } from '@/lib/build-mode'
import { getMcpAdminState } from '@/lib/mcp/settings'

export const Route = createFileRoute('/settings/mcp')({
  pendingComponent: PanelPending,
  loader: () => (DEMO_MODE ? null : getMcpAdminState()),
  component: McpSettingsSection,
})

function McpSettingsSection() {
  const state = Route.useLoaderData()
  return state ? <McpSettings state={state} /> : <DemoIntegrationNotice />
}
