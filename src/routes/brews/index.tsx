import {
  createFileRoute,
  Link,
  stripSearchParams,
  useNavigate,
} from '@tanstack/react-router'
import { Coffee, Plus } from 'lucide-react'
import {
  type CollectionColumn,
  type CollectionEntry,
  CollectionList,
} from '@/components/collection/collection-list'
import { EmptyState } from '@/components/empty-state'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { Page, PageHeader } from '@/components/page-layout'
import { PaginationControls } from '@/components/pagination-controls'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import {
  BrewCollectionFilters,
  BrewCollectionToolbar,
} from '@/components/shots/brew-collection-toolbar'
import { ShotsViewToggle } from '@/components/shots/shots-overview'
import { ShotsTable } from '@/components/shots/shots-table'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { StarRating } from '@/components/ui/star-rating'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { useTasteProfile } from '@/hooks/use-taste-profile'
import { nextSortDirection } from '@/lib/collection-sort'
import { thumbnailUrl } from '@/lib/image-url'
import {
  searchEnum,
  searchInteger,
  searchRecord,
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

type Shot = Awaited<ReturnType<typeof getShotPage>>['items'][number]

function getBeanThumbnail(bean: Shot['bean']): string | null {
  if (!bean?.images.length) return null
  const image =
    bean.images.find((candidate) => candidate.isThumbnail) ?? bean.images[0]
  return image ? thumbnailUrl(image.storagePath) : null
}

const parseBrewsSearch = (input: unknown) => {
  const search = searchRecord(input)
  return {
    page: searchInteger(search.page, 1, 1) ?? 1,
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
  search: {
    middlewares: [
      stripSearchParams({
        page: 1,
        sort: 'date',
        direction: 'desc',
        view: 'list',
      } as const),
    ],
  },
  loaderDeps: ({ search }) => ({
    page: search.page,
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
    <RouteError error={error} backTo="/overview" backLabel="Go to overview" />
  ),
})

function ShotsPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/brews/' })
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const showRating = useTasteProfile().overallRating
  const grouped = data.view === 'grouped'
  const totalItems = data.result.totalItems
  const resultLabel = grouped
    ? `${totalItems} ${totalItems === 1 ? 'bean group' : 'bean groups'}`
    : `${totalItems} ${totalItems === 1 ? 'brew' : 'brews'}`

  const updateSearch = (
    values: Partial<typeof search>,
    options?: { replace?: boolean },
  ) =>
    navigate({
      search: (current) => ({ ...current, ...values }),
      replace: options?.replace,
    })
  // The server ignores a rating filter while the overall rating is switched
  // off, so a stale search parameter must not count as an active filter here
  // either — otherwise it would suppress the empty state.
  const hasActiveFilters =
    Boolean(search.methodId) ||
    (showRating && search.rating !== undefined) ||
    search.beanId !== undefined

  const handleSort = (sort: (typeof SHOT_SORT_VALUES)[number]) =>
    updateSearch({
      sort,
      // New date/rating columns start with the most recent or best brews
      // first instead of the shared ascending default.
      direction:
        search.sort !== sort && (sort === 'date' || sort === 'rating')
          ? 'desc'
          : nextSortDirection(search.sort, search.direction, sort),
      page: 1,
    })

  const getEntry = (shot: Shot): CollectionEntry => {
    const shotDate = formatDate(shot.brewedAt)
    const params = { shotId: String(shot.id) }

    return {
      id: shot.id,
      title: shotDate,
      linkTitle: false,
      to: '/brews/$shotId',
      params,
      action: (
        <Button asChild variant="outline" size="xs">
          <Link
            to="/brews/$shotId"
            params={params}
            aria-label={`Open brew from ${shotDate}`}
          >
            Open
          </Link>
        </Button>
      ),
    }
  }

  const columns: readonly CollectionColumn<Shot>[] = [
    {
      key: 'bean',
      header: 'Bean',
      sortKey: 'bean',
      cell: (shot) => {
        if (!shot.bean) return '—'
        const thumbnail = getBeanThumbnail(shot.bean)
        return (
          <Link
            to="/beans/$beanId"
            params={{ beanId: String(shot.bean.id) }}
            className="inline-flex min-h-11 items-center gap-2 rounded-sm text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {thumbnail ? (
              <ImageWithFallback
                src={thumbnail}
                alt=""
                className="size-8 rounded-full object-cover"
              />
            ) : null}
            {shot.bean.name}
          </Link>
        )
      },
    },
    {
      key: 'method',
      header: 'Method',
      cell: (shot) => shot.brewingMethod.name,
    },
    {
      key: 'dose',
      header: 'Dose',
      align: 'right',
      sortKey: 'dose',
      cell: (shot) =>
        shot.doseGrams ? `${formatNumber(shot.doseGrams)} g` : '—',
    },
    {
      key: 'yield',
      header: 'Yield',
      align: 'right',
      sortKey: 'yield',
      cell: (shot) =>
        shot.yieldGrams ? `${formatNumber(shot.yieldGrams)} g` : '—',
    },
    {
      key: 'time',
      header: 'Time',
      align: 'right',
      sortKey: 'time',
      cell: (shot) =>
        shot.shotTimeSeconds ? `${formatNumber(shot.shotTimeSeconds)} s` : '—',
    },
    ...(showRating
      ? [
          {
            key: 'rating',
            header: 'Rating',
            align: 'right' as const,
            sortKey: 'rating',
            cell: (shot: Shot) =>
              shot.rating ? (
                <StarRating
                  value={shot.rating}
                  readOnly
                  variant="compact"
                  sizeClassName="size-3.5"
                  ariaLabel="Brew rating"
                />
              ) : (
                '—'
              ),
          },
        ]
      : []),
  ]

  return (
    <Page>
      <PageHeader
        title="Brews"
        description="Review every coffee you brew and how it turned out."
        help="Brews are individual coffee-making sessions. Log the beans, method, equipment, measurements, tasting notes, and rating so you can learn from each cup."
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
            {(totalItems > 0 || hasActiveFilters) && (
              <BrewCollectionFilters
                methodId={search.methodId ? String(search.methodId) : ''}
                rating={
                  search.rating !== undefined ? String(search.rating) : ''
                }
                methods={data.methods}
                resultLabel={resultLabel}
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
          methodId={search.methodId ? String(search.methodId) : ''}
          rating={search.rating !== undefined ? String(search.rating) : ''}
          resultLabel={resultLabel}
        />
      ) : null}

      {totalItems === 0 && !hasActiveFilters ? (
        <EmptyState
          icon={Coffee}
          title="No brews logged yet"
          description="Log your first brew to start building your coffee history."
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
          <CollectionList
            view="table"
            items={data.result.items}
            getEntry={getEntry}
            columns={columns}
            titleHeader="Date"
            titleSortKey="date"
            tableActionPlacement="after-title"
            sort={{
              key: search.sort,
              direction: search.direction,
              onSort: (sort) =>
                handleSort(searchEnum(sort, SHOT_SORT_VALUES, search.sort)),
            }}
          />
          {data.result.totalPages > 1 ? (
            <PaginationControls
              page={data.result.page}
              totalPages={data.result.totalPages}
              onPageChange={(page) => updateSearch({ page })}
            />
          ) : null}
        </div>
      )}
    </Page>
  )
}
