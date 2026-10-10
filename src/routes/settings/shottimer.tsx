import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ShottimerSettings } from '@/components/settings/shottimer-settings'
import { getShottimerSettings } from '@/lib/server/shottimer'

export const Route = createFileRoute('/settings/shottimer')({
  loader: () => getShottimerSettings(),
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
