import { createFileRoute } from '@tanstack/react-router'
import { DemoIntegrationNotice } from '@/components/edition-ui'
import { AiProviderSettings } from '@/components/settings/ai-provider-settings'
import { AiSettingsPanels } from '@/extension-points/ai-settings-panels'
import { DEMO_MODE } from '@/lib/build-mode'
import { getAiProviderSettings } from '@/lib/server/ai-provider-settings'

export const Route = createFileRoute('/settings/ai')({
  loader: async () => (DEMO_MODE ? null : getAiProviderSettings()),
  component: AiSettingsSection,
})

function AiSettingsSection() {
  const provider = Route.useLoaderData()
  if (!provider) return <DemoIntegrationNotice />
  return (
    <>
      <AiProviderSettings settings={provider} />
      <AiSettingsPanels />
    </>
  )
}
