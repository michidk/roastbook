import { createFileRoute } from '@tanstack/react-router'
import { McpSettings } from '@/components/settings/mcp-settings'
import { getMcpAdminState } from '@/lib/mcp/settings'

export const Route = createFileRoute('/settings/mcp')({
  loader: () => getMcpAdminState(),
  component: McpSettingsSection,
})

function McpSettingsSection() {
  return <McpSettings state={Route.useLoaderData()} />
}
