import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { GearDetailPage } from '@/components/gear/gear-detail-page'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import type { ShotsTableServerPagination } from '@/components/ShotsTable'
import { editModeSearchField } from '@/lib/edit-mode'
import { checkGearResearchEnabled, getGearById } from '@/lib/server/gear'
import { getGearShotPage } from '@/lib/server/shots'

const gearDetailSearchSchema = z.object({
  shotPage: z.number().int().min(1).max(100_000).default(1).catch(1),
  shotQuery: z.string().max(200).default('').catch(''),
  shotSort: z
    .enum(['date', 'bean', 'dose', 'yield', 'time', 'rating'])
    .default('date')
    .catch('date'),
  shotDirection: z.enum(['asc', 'desc']).default('desc').catch('desc'),
  edit: editModeSearchField,
})

export const Route = createFileRoute('/gear/$gearId')({
  validateSearch: gearDetailSearchSchema,
  loaderDeps: ({ search }) => ({
    shotPage: search.shotPage,
    shotQuery: search.shotQuery,
    shotSort: search.shotSort,
    shotDirection: search.shotDirection,
  }),
  loader: async ({ params, deps }) => {
    const gearId = Number(params.gearId)
    const [gear, shotPage, research] = await Promise.all([
      getGearById({ data: gearId }),
      getGearShotPage({
        data: {
          entityId: gearId,
          page: deps.shotPage,
          query: deps.shotQuery,
          sort: deps.shotSort,
          direction: deps.shotDirection,
        },
      }),
      checkGearResearchEnabled(),
    ])
    return { gear, shotPage, researchEnabled: research.enabled }
  },
  component: GearDetailRoute,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/gear" backLabel="Back to gear" />
  ),
})

function GearDetailRoute() {
  const { gear, shotPage, researchEnabled } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/gear/$gearId' })

  const updateShotSearch = (values: Partial<typeof search>) =>
    navigate({ search: (current) => ({ ...current, ...values }) })

  const shotsPagination: ShotsTableServerPagination = {
    page: shotPage.page,
    totalPages: shotPage.totalPages,
    totalItems: shotPage.totalItems,
    query: search.shotQuery,
    sortKey: search.shotSort,
    sortDirection: search.shotDirection,
    onPageChange: (shotPage) => updateShotSearch({ shotPage }),
    onQueryChange: (shotQuery) => updateShotSearch({ shotQuery, shotPage: 1 }),
    onSort: (shotSort) =>
      updateShotSearch({
        shotSort,
        shotDirection:
          search.shotSort === shotSort
            ? search.shotDirection === 'asc'
              ? 'desc'
              : 'asc'
            : shotSort === 'date' || shotSort === 'rating'
              ? 'desc'
              : 'asc',
        shotPage: 1,
      }),
  }

  return (
    <GearDetailPage
      gear={gear}
      shots={shotPage.items}
      shotsPagination={shotsPagination}
      researchEnabled={researchEnabled}
      detailRouteId={Route.id}
      isEditing={search.edit ?? false}
      onFinishEditing={() =>
        navigate({ search: (current) => ({ ...current, edit: undefined }) })
      }
    />
  )
}
