import { createFileRoute } from '@tanstack/react-router'
import { PanelPending } from '@/components/route-pending'
import { AboutSettings } from '@/components/settings/about-settings'

export const Route = createFileRoute('/settings/about')({
  pendingComponent: PanelPending,
  component: AboutSettings,
})
