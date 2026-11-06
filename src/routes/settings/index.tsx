import { createFileRoute } from '@tanstack/react-router'
import { PanelPending } from '@/components/route-pending'
import { GeneralSettings } from '@/components/settings/general-settings'

export const Route = createFileRoute('/settings/')({
  pendingComponent: PanelPending,
  component: GeneralSettingsSection,
})

function GeneralSettingsSection() {
  return <GeneralSettings />
}
