import { createFileRoute, notFound } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { RoutePending } from '@/components/route-pending'
import { DEMO_MODE } from '@/lib/build-mode'
import { DashboardPage } from '@/modules/dashboard/components/dashboard-page'
import { loadDashboardData } from '@/modules/dashboard/lib/dashboard-data'

export const Route = createFileRoute('/demo/')({
  beforeLoad: () => {
    if (!DEMO_MODE) throw notFound()
  },
  loader: loadDashboardData,
  head: () => ({ meta: [{ title: 'Demo dashboard · Roastbook' }] }),
  component: DemoDashboard,
  pendingComponent: RoutePending,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

function DemoDashboard() {
  return <DashboardPage {...Route.useLoaderData()} />
}
