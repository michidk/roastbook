import { createFileRoute, useRouter } from '@tanstack/react-router'
import { GeneralSettings } from '@/components/settings/general-settings'

export const Route = createFileRoute('/settings/')({
  component: GeneralSettingsSection,
})

function GeneralSettingsSection() {
  const router = useRouter()

  return <GeneralSettings onSaved={() => void router.invalidate()} />
}
