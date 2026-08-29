import { createFileRoute } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { RoutePending } from '@/components/route-pending'
import { DEMO_MODE } from '@/lib/build-mode'
import { DashboardPage } from '@/modules/dashboard/components/dashboard-page'
import { loadDashboardData } from '@/modules/dashboard/lib/dashboard-data'
import { DemoLandingPage } from '@/routes/-components/demo-landing-page'

export const Route = createFileRoute('/')({
  loader: () => (DEMO_MODE ? null : loadDashboardData()),
  head: () => ({
    meta: DEMO_MODE
      ? [
          { title: 'Roastbook — The coffee journal you actually own' },
          {
            name: 'description',
            content:
              'A self-hosted coffee journal for brews, beans, recipes, gear, café visits, and the details that make a great cup repeatable.',
          },
        ]
      : [{ title: 'Dashboard · Roastbook' }],
  }),
  component: IndexPage,
  pendingComponent: RoutePending,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

function IndexPage() {
  const dashboardData = Route.useLoaderData()

  return dashboardData ? (
    <DashboardPage {...dashboardData} />
  ) : (
    <DemoLandingPage />
  )
}
