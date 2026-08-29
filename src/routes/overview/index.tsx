import { createFileRoute } from '@tanstack/react-router'
import { RouteError } from '@/components/route-error'
import { RoutePending } from '@/components/route-pending'
import { OverviewPage } from '@/routes/overview/-components/overview-page'
import { loadOverviewData } from '@/routes/overview/-lib/overview-data'

export const Route = createFileRoute('/overview/')({
  loader: loadOverviewData,
  head: () => ({ meta: [{ title: 'Overview · Roastbook' }] }),
  component: Overview,
  pendingComponent: RoutePending,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

function Overview() {
  return <OverviewPage {...Route.useLoaderData()} />
}
