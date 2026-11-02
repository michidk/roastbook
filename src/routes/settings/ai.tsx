import { createFileRoute } from '@tanstack/react-router'
import { AiProviderSettings } from '@/components/settings/ai-provider-settings'
import { AiSettings } from '@/components/settings/ai-settings'
import { getAiProviderSettings } from '@/lib/server/ai-provider-settings'
import { getAiRequestStats } from '@/lib/server/ai-request-logs'
import { loadOfflineSettingsData } from '@/modules/offline/settings-cache'

export const Route = createFileRoute('/settings/ai')({
  loader: async () => {
    const [stats, provider] = await Promise.all([
      loadOfflineSettingsData('ai', () => getAiRequestStats()),
      loadOfflineSettingsData('ai-provider', () => getAiProviderSettings()),
    ])
    return { stats, provider }
  },
  component: AiSettingsSection,
})

function AiSettingsSection() {
  const { stats, provider } = Route.useLoaderData()
  return (
    <>
      <AiProviderSettings settings={provider} />
      <AiSettings stats={stats} />
    </>
  )
}
