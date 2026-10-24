import { createFileRoute } from '@tanstack/react-router'
import { StorageSettings } from '@/components/settings/storage-settings'
import { getInternalStats } from '@/lib/server/internal-stats'
import { loadOfflineSettingsData } from '@/modules/offline/settings-cache'

export const Route = createFileRoute('/settings/storage')({
  loader: () => loadOfflineSettingsData('storage', () => getInternalStats()),
  component: StorageSettingsSection,
})

function StorageSettingsSection() {
  return <StorageSettings storage={Route.useLoaderData().storage} />
}
