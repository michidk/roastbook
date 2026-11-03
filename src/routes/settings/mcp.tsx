import { createFileRoute } from '@tanstack/react-router'
import { DemoIntegrationNotice } from '@/components/demo-integration-notice'
import { McpSettings } from '@/components/settings/mcp-settings'
import { DEMO_MODE } from '@/lib/build-mode'
import { getMcpAdminState } from '@/lib/mcp/settings'

export const Route = createFileRoute('/settings/mcp')({
  loader: () => (DEMO_MODE ? null : getMcpAdminState()),
  component: McpSettingsSection,
})

function McpSettingsSection() {
  const state = Route.useLoaderData()
  return state ? <McpSettings state={state} /> : <DemoIntegrationNotice />
}
