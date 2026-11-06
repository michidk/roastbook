import { createFileRoute } from '@tanstack/react-router'
import { PanelPending } from '@/components/route-pending'
import { OfflineSettings } from '@/components/settings/offline-settings'

export const Route = createFileRoute('/settings/offline')({
  pendingComponent: PanelPending,
  component: OfflineSettings,
})
