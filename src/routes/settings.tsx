import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { RoutePending } from '@/components/route-pending'
import { SETTINGS_SECTIONS } from '@/components/settings/settings-sections'
import { SettingsShell } from '@/components/settings/settings-shell'
import { useAppSettings } from '@/hooks/use-app-settings'
import { DEMO_MODE } from '@/lib/build-mode'

export const Route = createFileRoute('/settings')({
  component: SettingsLayout,
  pendingComponent: RoutePending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/overview" backLabel="Go to overview" />
  ),
})

function SettingsLayout() {
  const { account } = useAppSettings()
  const sections = SETTINGS_SECTIONS.filter(
    (section) =>
      // The demo keeps its journal in the browser and never syncs.
      (section.to !== '/settings/offline' || !DEMO_MODE) &&
      (section.to !== '/settings/account' || Boolean(account)),
  )
  return (
    <Page>
      <PageHeader
        title="Settings"
        description="Configure your Roastbook experience and installation"
      />

      <SettingsShell sections={sections}>
        <Outlet />
      </SettingsShell>
    </Page>
  )
}
