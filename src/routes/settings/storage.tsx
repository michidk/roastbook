import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { StorageSettings } from '@/components/settings/storage-settings'
import { Button } from '@/components/ui/button'
import { getInternalStats } from '@/journal/internal-stats'

export const Route = createFileRoute('/settings/storage')({
  loader: () => getInternalStats(),
  component: StorageSettingsSection,
})

function StorageSettingsSection() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const storage = Route.useLoaderData().storage
  return (
    <div>
      <StorageSettings storage={storage} />
      <Button
        type="button"
        variant="outline"
        disabled={refreshing}
        className="mt-4"
        onClick={async () => {
          setRefreshing(true)
          setError(false)
          try {
            await router.invalidate({ sync: true })
          } catch {
            setError(true)
          } finally {
            setRefreshing(false)
          }
        }}
      >
        {refreshing ? 'Refreshing…' : 'Refresh usage'}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive-text">
          Could not refresh usage. Try again.
        </p>
      )}
    </div>
  )
}
