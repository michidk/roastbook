import { createFileRoute } from '@tanstack/react-router'
import { StorageSettings } from '@/components/settings/storage-settings'
import { getInternalStats } from '@/lib/server/internal-stats'

export const Route = createFileRoute('/settings/storage')({
  loader: () => getInternalStats(),
  component: StorageSettingsSection,
})

function StorageSettingsSection() {
  return <StorageSettings storage={Route.useLoaderData().storage} />
}
