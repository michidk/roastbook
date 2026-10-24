import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ShottimerSettings } from '@/components/settings/shottimer-settings'
import { getShottimerSettings } from '@/lib/server/shottimer'
import { loadOfflineSettingsData } from '@/modules/offline/settings-cache'

export const Route = createFileRoute('/settings/shottimer')({
  loader: () =>
    loadOfflineSettingsData('shottimer', () => getShottimerSettings()),
  component: ShottimerSettingsSection,
})

function ShottimerSettingsSection() {
  const router = useRouter()

  return (
    <ShottimerSettings
      settings={Route.useLoaderData()}
      onSaved={() => void router.invalidate()}
    />
  )
}
