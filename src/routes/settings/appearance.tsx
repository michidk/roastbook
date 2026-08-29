import { createFileRoute, useRouter } from '@tanstack/react-router'
import { AppearanceSettings } from '@/components/settings/appearance-settings'

export const Route = createFileRoute('/settings/appearance')({
  component: AppearanceSettingsSection,
})

function AppearanceSettingsSection() {
  const router = useRouter()

  return <AppearanceSettings onSaved={() => void router.invalidate()} />
}
