import { createFileRoute } from '@tanstack/react-router'
import { OfflineSettings } from '@/components/settings/offline-settings'
import { usePwaMode } from '@/hooks/use-pwa-mode'

export const Route = createFileRoute('/settings/offline')({
  component: OfflineSettingsSection,
})

function OfflineSettingsSection() {
  const isPwa = usePwaMode()
  return isPwa ? (
    <OfflineSettings />
  ) : (
    <p className="text-sm text-muted-foreground">
      Open Roastbook as an installed app to manage PWA settings.
    </p>
  )
}
