import { createFileRoute } from '@tanstack/react-router'
import { AiAllowanceSettings } from '@/components/settings/ai-allowance-settings'
import { AiProviderSettings } from '@/components/settings/ai-provider-settings'
import { AiSettings } from '@/components/settings/ai-settings'
import { getAiProviderSettings } from '@/lib/server/ai-provider-settings'
import {
  getAiRequestStats,
  getProvidedAiRequestStats,
} from '@/lib/server/ai-request-logs'
import { loadOfflineSettingsData } from '@/modules/offline/settings-cache'

export const Route = createFileRoute('/settings/ai')({
  loader: async () => {
    const [stats, provider, providedStats] = await Promise.all([
      loadOfflineSettingsData('ai', () => getAiRequestStats()),
      loadOfflineSettingsData('ai-provider', () => getAiProviderSettings()),
      loadOfflineSettingsData('ai-provided-usage', () =>
        getProvidedAiRequestStats(),
      ),
    ])
    return { stats, provider, providedStats }
  },
  component: AiSettingsSection,
})

function AiSettingsSection() {
  const { stats, provider, providedStats } = Route.useLoaderData()
  return (
    <>
      <AiProviderSettings settings={provider} />
      <AiAllowanceSettings
        allowance={provider.allowance}
        stats={providedStats}
      />
      <AiSettings
        stats={stats}
        providedAvailable={provider.allowance.providedAvailable}
      />
    </>
  )
}
