import { createFileRoute } from '@tanstack/react-router'
import { PanelPending } from '@/components/route-pending'
import { AppearanceSettings } from '@/components/settings/appearance-settings'

export const Route = createFileRoute('/settings/appearance')({
  pendingComponent: PanelPending,
  component: AppearanceSettingsSection,
})

function AppearanceSettingsSection() {
  return <AppearanceSettings />
}
