import { createFileRoute } from '@tanstack/react-router'
import { DemoIntegrationNotice } from '@/components/edition-ui'
import { ApiSettings } from '@/components/settings/api-settings'
import { DEMO_MODE } from '@/lib/build-mode'
import { getApiAccessState } from '@/lib/server/integrations'

export const Route = createFileRoute('/settings/api')({
  loader: () => (DEMO_MODE ? null : getApiAccessState()),
  component: ApiSettingsSection,
})

function ApiSettingsSection() {
  const state = Route.useLoaderData()
  return state ? <ApiSettings state={state} /> : <DemoIntegrationNotice />
}
