import {
  createFileRoute,
  linkOptions,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { RoutePending } from '@/components/route-pending'
import {
  SectionLayout,
  type SectionNavigationItem,
} from '@/components/section-layout'
import { extensionAdminSections } from '@/extension-points/admin-sections'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { getCurrentAccount } from '@/lib/server/account'

const sections = [
  ...linkOptions([
    { to: '/admin/users', search: { page: 0 }, label: 'Users', icon: Users },
  ]),
  ...extensionAdminSections,
] satisfies readonly SectionNavigationItem[]

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const account = await getCurrentAccount()
    if (account.identity?.role !== 'admin') throw redirect({ to: '/settings' })
  },
  component: AdminLayout,
  pendingComponent: RoutePending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/settings" backLabel="Go to settings" />
  ),
})

function AdminLayout() {
  const online = useOnlineStatus()
  return (
    <Page>
      <PageHeader
        title="Admin"
        description="Manage accounts and administrator access."
      />
      <SectionLayout label="Admin" sections={sections} contentWidth="full">
        {!online ? (
          <p
            role="status"
            className="mb-5 rounded-xl border border-border bg-secondary/45 p-3 text-sm text-muted-foreground"
          >
            You’re offline. Connect to manage accounts and view current usage.
          </p>
        ) : null}
        <fieldset
          disabled={!online}
          className="m-0 min-w-0 divide-y divide-border border-0 p-0"
        >
          <Outlet />
        </fieldset>
      </SectionLayout>
    </Page>
  )
}
