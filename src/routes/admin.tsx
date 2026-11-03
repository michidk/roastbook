import {
  createFileRoute,
  linkOptions,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { ChartNoAxesCombined, Users } from 'lucide-react'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { RoutePending } from '@/components/route-pending'
import {
  SectionLayout,
  type SectionNavigationItem,
} from '@/components/section-layout'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { getCurrentAccount } from '@/lib/server/account'

const sections = linkOptions([
  { to: '/admin/users', search: { page: 0 }, label: 'Users', icon: Users },
  {
    to: '/admin/ai',
    search: { includeByo: false, days: 30 },
    label: 'AI costs and requests',
    icon: ChartNoAxesCombined,
  },
]) satisfies readonly SectionNavigationItem[]

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const account = await getCurrentAccount()
    if (account.identity?.role !== 'admin') throw redirect({ to: '/settings' })
    return { providedAiAvailable: account.providedAiAvailable }
  },
  component: AdminLayout,
  pendingComponent: RoutePending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/settings" backLabel="Go to settings" />
  ),
})

function AdminLayout() {
  const { providedAiAvailable } = Route.useRouteContext()
  const online = useOnlineStatus()
  return (
    <Page>
      <PageHeader
        title="Admin"
        description="Manage accounts and instance-wide usage."
      />
      <SectionLayout
        label="Admin"
        sections={sections.filter(
          (section) => section.to !== '/admin/ai' || providedAiAvailable,
        )}
        contentWidth="full"
      >
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
