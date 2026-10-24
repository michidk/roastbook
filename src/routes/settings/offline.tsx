import { createFileRoute } from '@tanstack/react-router'
import { OfflineSettings } from '@/components/settings/offline-settings'

export const Route = createFileRoute('/settings/offline')({
  component: OfflineSettingsSection,
})

function OfflineSettingsSection() {
  return <OfflineSettings />
}
