import { createFileRoute } from '@tanstack/react-router'
import { AiModeSettings } from '@/components/settings/ai-mode-settings'
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
      <AiModeSettings allowance={provider.allowance} stats={providedStats} />
      {provider.allowance.mode === 'byo' ? (
        <AiProviderSettings key={provider.allowance.mode} settings={provider} />
      ) : null}
      <AiSettings
        stats={stats}
        providedAvailable={provider.allowance.providedAvailable}
      />
    </>
  )
}
