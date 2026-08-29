import { createFileRoute } from '@tanstack/react-router'
import { AboutSettings } from '@/components/settings/about-settings'

export const Route = createFileRoute('/settings/about')({
  component: AboutSettings,
})
