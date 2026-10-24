import { createFileRoute } from '@tanstack/react-router'
import { AiSettings } from '@/components/settings/ai-settings'
import { getAiRequestStats } from '@/lib/server/ai-request-logs'
import { loadOfflineSettingsData } from '@/modules/offline/settings-cache'

export const Route = createFileRoute('/settings/ai')({
  loader: () => loadOfflineSettingsData('ai', () => getAiRequestStats()),
  component: AiSettingsSection,
})

function AiSettingsSection() {
  return <AiSettings stats={Route.useLoaderData()} />
}
