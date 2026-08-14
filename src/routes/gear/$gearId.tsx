import { createFileRoute } from '@tanstack/react-router'
import { GearDetailPage } from '@/components/gear/gear-detail-page'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { checkGearResearchEnabled, getGearById } from '@/lib/server/gear'
import { getShotsByGear } from '@/lib/server/shots'

export const Route = createFileRoute('/gear/$gearId')({
  loader: async ({ params }) => {
    const gearId = Number(params.gearId)
    const [gear, shots, research] = await Promise.all([
      getGearById({ data: gearId }),
      getShotsByGear({ data: gearId }),
      checkGearResearchEnabled(),
    ])
    return { gear, shots, researchEnabled: research.enabled }
  },
  component: GearDetailRoute,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/gear" backLabel="Back to gear" />
  ),
})

function GearDetailRoute() {
  return <GearDetailPage {...Route.useLoaderData()} detailRouteId={Route.id} />
}
