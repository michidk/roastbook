import { createFileRoute } from '@tanstack/react-router'
import { DemoIntegrationNotice } from '@/components/edition-ui'
import { AiAllowanceSettings } from '@/components/settings/ai-allowance-settings'
import { AiProviderSettings } from '@/components/settings/ai-provider-settings'
import { AiSettings } from '@/components/settings/ai-settings'
import { DEMO_MODE } from '@/lib/build-mode'
import { getAiProviderSettings } from '@/lib/server/ai-provider-settings'
import {
  getAiRequestStats,
  getProvidedAiRequestStats,
} from '@/lib/server/ai-request-logs'

export const Route = createFileRoute('/settings/ai')({
  loader: async () => {
    if (DEMO_MODE) return null
    const [stats, provider, providedStats] = await Promise.all([
      getAiRequestStats(),
      getAiProviderSettings(),
      getProvidedAiRequestStats(),
    ])
    return { stats, provider, providedStats }
  },
  component: AiSettingsSection,
})

function AiSettingsSection() {
  const data = Route.useLoaderData()
  if (!data) return <DemoIntegrationNotice />
  const { stats, provider, providedStats } = data
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
