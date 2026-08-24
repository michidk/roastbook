import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { GearDetailPage } from '@/components/gear/gear-detail-page'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import type { ShotsTableServerPagination } from '@/components/ShotsTable'
import { parseEditModeSearch } from '@/lib/edit-mode'
import {
  searchEnum,
  searchInteger,
  searchRecord,
  searchString,
  searchValidator,
} from '@/lib/search-params'
import { checkGearResearchEnabled, getGearById } from '@/lib/server/gear'
import { getGearShotPage } from '@/lib/server/shots'

const parseGearDetailSearch = (input: unknown) => {
  const search = searchRecord(input)
  return {
    shotPage: searchInteger(search.shotPage, 1, 1, 100_000) ?? 1,
    shotQuery: searchString(search.shotQuery),
    shotSort: searchEnum(
      search.shotSort,
      ['date', 'bean', 'dose', 'yield', 'time', 'rating'],
      'date',
    ),
    shotDirection: searchEnum(search.shotDirection, ['asc', 'desc'], 'desc'),
    ...parseEditModeSearch(search),
  }
}

export const Route = createFileRoute('/gear/$gearId')({
  validateSearch: searchValidator(parseGearDetailSearch),
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
      isEditing={search.edit ?? false}
      onFinishEditing={() =>
        navigate({ search: (current) => ({ ...current, edit: undefined }) })
      }
    />
  )
}
