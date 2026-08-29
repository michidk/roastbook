import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { RoutePending } from '@/components/route-pending'
import { SETTINGS_SECTIONS } from '@/components/settings/settings-sections'
import { SettingsShell } from '@/components/settings/settings-shell'

export const Route = createFileRoute('/settings')({
  component: SettingsLayout,
  pendingComponent: RoutePending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/overview" backLabel="Go to overview" />
  ),
})

function SettingsLayout() {
  return (
    <Page>
      <PageHeader
        title="Settings"
        description="Configure your Roastbook experience and installation"
      />

      <SettingsShell sections={SETTINGS_SECTIONS}>
        <Outlet />
      </SettingsShell>
    </Page>
  )
}
