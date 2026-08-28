import {
  createFileRoute,
  stripSearchParams,
  useNavigate,
} from '@tanstack/react-router'
import { GearDetailPage } from '@/components/gear/gear-detail-page'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import type { ShotsTableServerPagination } from '@/components/shots/shots-table'
import { nextSortDirection } from '@/lib/collection-sort'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { parseIdParam } from '@/lib/route-params'
import {
  searchEnum,
  searchInteger,
  searchRecord,
  searchValidator,
} from '@/lib/search-params'
import { checkGearResearchEnabled, getGearById } from '@/lib/server/gear'
import { getGearShotPage } from '@/lib/server/shots'

const parseGearDetailSearch = (input: unknown) => {
  const search = searchRecord(input)
  return {
    brewPage: searchInteger(search.brewPage, 1, 1, 100_000) ?? 1,
    brewSort: searchEnum(
      search.brewSort,
      ['date', 'bean', 'dose', 'yield', 'time', 'rating'],
      'date',
    ),
    brewDirection: searchEnum(search.brewDirection, ['asc', 'desc'], 'desc'),
    ...parseEditModeSearch(search),
  }
}

export const Route = createFileRoute('/gear/$gearId')({
  validateSearch: searchValidator(parseGearDetailSearch),
  search: {
    middlewares: [
      stripSearchParams({
        brewPage: 1,
        brewSort: 'date',
        brewDirection: 'desc',
      } as const),
    ],
  },
  loaderDeps: ({ search }) => ({
    brewPage: search.brewPage,
    brewSort: search.brewSort,
    brewDirection: search.brewDirection,
  }),
  loader: async ({ params, deps }) => {
    const gearId = parseIdParam(params.gearId)
    const [gear, shotPage, research] = await Promise.all([
      getGearById({ data: gearId }),
      getGearShotPage({
        data: {
          entityId: gearId,
          page: deps.brewPage,
          sort: deps.brewSort,
          direction: deps.brewDirection,
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
    sortKey: search.brewSort,
    sortDirection: search.brewDirection,
    onPageChange: (brewPage) => updateShotSearch({ brewPage }),
    onSort: (brewSort) =>
      updateShotSearch({
        brewSort,
        // New date/rating columns start with the most recent or best
        // brews first instead of the shared ascending default.
        brewDirection:
          search.brewSort !== brewSort &&
          (brewSort === 'date' || brewSort === 'rating')
            ? 'desc'
            : nextSortDirection(
                search.brewSort,
                search.brewDirection,
                brewSort,
              ),
        brewPage: 1,
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
