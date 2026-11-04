import { createFileRoute } from '@tanstack/react-router'
import { GeneralSettings } from '@/components/settings/general-settings'

export const Route = createFileRoute('/settings/')({
  component: GeneralSettingsSection,
})

function GeneralSettingsSection() {
  return <GeneralSettings />
}
