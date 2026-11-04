import { createFileRoute, useRouter } from '@tanstack/react-router'
import { DemoIntegrationNotice } from '@/components/edition-ui'
import { ShottimerSettings } from '@/components/settings/shottimer-settings'
import { DEMO_MODE } from '@/lib/build-mode'
import { getShottimerSettings } from '@/lib/server/shottimer'

export const Route = createFileRoute('/settings/shottimer')({
  loader: () => (DEMO_MODE ? null : getShottimerSettings()),
  component: ShottimerSettingsSection,
})

function ShottimerSettingsSection() {
  const router = useRouter()
  const settings = Route.useLoaderData()
  if (!settings) return <DemoIntegrationNotice />

  return (
    <ShottimerSettings
      settings={settings}
      onSaved={() => void router.invalidate()}
    />
  )
}
