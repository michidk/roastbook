import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Coffee, Plus } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { Page, PageHeader } from '@/components/page-layout'
import { PaginationControls } from '@/components/pagination-controls'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import { ShotsTable } from '@/components/ShotsTable'
import { BrewCollectionToolbar } from '@/components/shots/brew-collection-toolbar'
import { ShotsViewToggle } from '@/components/shots-overview'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTasteProfile } from '@/hooks/use-taste-profile'
import { thumbnailUrl } from '@/lib/image-url'
import {
  searchEnum,
  searchInteger,
  searchRecord,
  searchString,
  searchValidator,
} from '@/lib/search-params'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getShotGroups, getShotPage } from '@/lib/server/shots'

const SHOT_SORT_VALUES = [
  'date',
  'bean',
  'dose',
  'yield',
  'time',
  'rating',
] as const

const parseBrewsSearch = (input: unknown) => {
  const search = searchRecord(input)
  return {
    page: searchInteger(search.page, 1, 1) ?? 1,
    query: searchString(search.query),
    sort: searchEnum(search.sort, SHOT_SORT_VALUES, 'date'),
    direction: searchEnum(search.direction, ['asc', 'desc'], 'desc'),
    view: searchEnum(search.view, ['list', 'grouped'], 'list'),
    methodId: searchInteger(search.methodId, undefined, 1),
    rating: searchInteger(search.rating, undefined, 0, 5),
    beanId: searchInteger(search.beanId, undefined, 0, 100_000),
  }
}

export const Route = createFileRoute('/brews/')({
  validateSearch: searchValidator(parseBrewsSearch),
  loaderDeps: ({ search }) => ({
    page: search.page,
    query: search.query,
    sort: search.sort,
    direction: search.direction,
    view: search.view,
    methodId: search.methodId,
    rating: search.rating,
    beanId: search.beanId,
  }),
  loader: async ({ deps }) => {
    if (deps.view === 'grouped') {
      const [methods, result] = await Promise.all([
        getBrewingMethods(),
        getShotGroups({
          data: {
            page: deps.page,
            query: deps.query,
            methodId: deps.methodId,
            rating: deps.rating,
          },
        }),
      ])
      return { view: 'grouped' as const, result, methods }
    }

    const [methods, result] = await Promise.all([
      getBrewingMethods(),
      getShotPage({
        data: {
          page: deps.page,
          query: deps.query,
          sort: deps.sort,
          direction: deps.direction,
          methodId: deps.methodId,
          rating: deps.rating,
          beanId: deps.beanId,
        },
      }),
    ])
    return { view: 'list' as const, result, methods }
  },
  staleTime: 15_000,
  component: ShotsPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

function ShotsPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/brews/' })
  const showRating = useTasteProfile().overallRating
  const grouped = data.view === 'grouped'
  const totalItems = data.result.totalItems

  const updateSearch = (
    values: Partial<typeof search>,
    options?: { readonly replace?: boolean },
  ) =>
    navigate({
      search: (current) => ({ ...current, ...values }),
      replace: options?.replace,
    })
  // The server ignores a rating filter while the overall rating is switched
  // off, so a stale search parameter must not count as an active filter here
  // either — otherwise it would suppress the empty state.
  const hasActiveFilters =
    Boolean(search.query || search.methodId) ||
    (showRating && search.rating !== undefined) ||
    search.beanId !== undefined

  return (
    <Page>
      <PageHeader
        title="Brews"
        description="Your brewing history across every method"
        actions={
          <>
            {totalItems > 0 && (
              <ShotsViewToggle
                grouped={grouped}
                onGroupedChange={(nextGrouped) =>
                  updateSearch({
                    view: nextGrouped ? 'grouped' : 'list',
                    page: 1,
                    beanId: undefined,
                  })
                }
              />
            )}
            <Button asChild>
              <Link to="/brews/new">
                <Plus className="h-4 w-4" />
                Log a brew
              </Link>
            </Button>
          </>
        }
      />

      {totalItems > 0 || hasActiveFilters ? (
        <BrewCollectionToolbar
          query={search.query}
          methodId={search.methodId ? String(search.methodId) : ''}
          rating={search.rating !== undefined ? String(search.rating) : ''}
          methods={data.methods}
          resultLabel={
            grouped
              ? `${totalItems} ${totalItems === 1 ? 'bean group' : 'bean groups'}`
              : `${totalItems} ${totalItems === 1 ? 'brew' : 'brews'}`
          }
          onQueryChange={(query) =>
            updateSearch({ query, page: 1 }, { replace: true })
          }
          onMethodChange={(value) =>
            updateSearch({
              methodId: value ? Number(value) : undefined,
              page: 1,
            })
          }
          onRatingChange={(value) =>
            updateSearch({
              rating: value ? Number(value) : undefined,
              page: 1,
            })
          }
          onClearFilters={() =>
            updateSearch({
              methodId: undefined,
              rating: undefined,
              page: 1,
            })
          }
        />
      ) : null}

      {totalItems === 0 && !hasActiveFilters ? (
        <EmptyState
          icon={Coffee}
          title="No brews logged yet"
          description="Start tracking your coffee brewing"
          actionLabel="Log your first brew"
          actionHref="/brews/new"
        />
      ) : data.view === 'grouped' ? (
        <div className="space-y-4">
          {data.result.groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No brews match the current filters.
            </p>
          ) : null}
          {data.result.groups.map((group) => {
            const headingId = `shots-${group.key}`
            const thumbnail =
              group.shots[0]?.bean?.images?.find(
                (image) => image.isThumbnail,
              ) ?? group.shots[0]?.bean?.images?.[0]

            return (
              <section key={group.key} aria-labelledby={headingId}>
                <Card>
                  <CardHeader className="items-center gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <ImageWithFallback
                        src={
                          thumbnail
                            ? thumbnailUrl(thumbnail.storagePath)
                            : undefined
                        }
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      />
                      <CardTitle
                        id={headingId}
                        className="text-lg leading-tight"
                      >
                        {group.bean ? (
                          <Link
                            to="/beans/$beanId"
                            params={{ beanId: String(group.bean.id) }}
                            className="inline-flex min-h-11 items-center rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {group.label}
                          </Link>
                        ) : (
                          group.label
                        )}
                      </CardTitle>
                    </div>
                    <CardAction className="flex items-center gap-2 self-center">
                      <span className="text-sm font-semibold text-muted-foreground">
                        {group.shots.length < group.totalShots
                          ? `Latest ${group.shots.length} of ${group.totalShots} brews`
                          : `${group.totalShots} brew${group.totalShots === 1 ? '' : 's'}`}
                      </span>
                      {group.shots.length < group.totalShots && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateSearch({
                              view: 'list',
                              beanId: group.bean?.id ?? 0,
                              page: 1,
                              query: '',
                              sort: 'date',
                              direction: 'desc',
                            })
                          }
                        >
                          View all
                        </Button>
                      )}
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <ShotsTable shots={group.shots} hideBean />
                  </CardContent>
                </Card>
              </section>
            )
          })}
          {data.result.totalPages > 1 && (
            <PaginationControls
              page={data.result.page}
              totalPages={data.result.totalPages}
              onPageChange={(page) => updateSearch({ page })}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {data.result.scopeLabel ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Showing brews for {data.result.scopeLabel}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateSearch({ beanId: undefined, page: 1 })}
              >
                Clear filter
              </Button>
            </div>
          ) : null}
          <Card className="max-md:overflow-visible max-md:bg-transparent max-md:py-0 max-md:shadow-none">
            <CardContent className="pt-6 max-md:px-0 max-md:pt-0">
              <ShotsTable
                shots={data.result.items}
                hideToolbar
                serverPagination={{
                  page: data.result.page,
                  totalPages: data.result.totalPages,
                  totalItems: data.result.totalItems,
                  query: search.query,
                  scopeLabel: data.result.scopeLabel,
                  sortKey: search.sort,
                  sortDirection: search.direction,
                  onPageChange: (page) => updateSearch({ page }),
                  onQueryChange: (query) =>
                    updateSearch({ query, page: 1 }, { replace: true }),
                  onClearScope: data.result.scopeLabel
                    ? () => updateSearch({ beanId: undefined, page: 1 })
                    : undefined,
                  onSort: (sort) =>
                    updateSearch({
                      sort,
                      direction:
                        search.sort === sort
                          ? search.direction === 'asc'
                            ? 'desc'
                            : 'asc'
                          : sort === 'date' || sort === 'rating'
                            ? 'desc'
                            : 'asc',
                      page: 1,
                    }),
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </Page>
  )
}
