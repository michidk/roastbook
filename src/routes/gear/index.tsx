import {
  createFileRoute,
  Link,
  stripSearchParams,
  useNavigate,
} from '@tanstack/react-router'
import { ChevronDown, Cog, Plus } from 'lucide-react'
import { CollectionToolbar } from '@/components/collection-toolbar'
import { EmptyState } from '@/components/empty-state'
import { CollectionSortControl } from '@/components/gear/collection-sort-control'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { Page, PageHeader } from '@/components/page-layout'
import { PaginationControls } from '@/components/pagination-controls'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  interactiveCardLinkClassName,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { nextSortDirection } from '@/lib/collection-sort'
import { GEAR_TYPE_LABELS } from '@/lib/constants'
import { imageUrl } from '@/lib/image-url'
import {
  searchEnum,
  searchInteger,
  searchRecord,
  searchString,
  searchValidator,
} from '@/lib/search-params'
import { getGearPage } from '@/lib/server/gear'
import { cn } from '@/lib/utils'

const parseGearSearch = (input: unknown) => {
  const search = searchRecord(input)
  return {
    activePage: searchInteger(search.activePage, 1, 1) ?? 1,
    archivedPage: searchInteger(search.archivedPage, 1, 1) ?? 1,
    query: searchString(search.query),
    sort: searchEnum(search.sort, ['added', 'name', 'type'], 'added'),
    direction: searchEnum(search.direction, ['asc', 'desc'], 'desc'),
  }
}

export const Route = createFileRoute('/gear/')({
  validateSearch: searchValidator(parseGearSearch),
  search: {
    middlewares: [
      stripSearchParams({
        activePage: 1,
        archivedPage: 1,
        query: '',
        sort: 'added',
        direction: 'desc',
      } as const),
    ],
  },
  loaderDeps: ({ search }) => ({
    activePage: search.activePage,
    archivedPage: search.archivedPage,
    query: search.query,
    sort: search.sort,
    direction: search.direction,
  }),
  loader: ({ deps }) => getGearPage({ data: deps }),
  staleTime: 15_000,
  component: GearPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/overview" backLabel="Go to overview" />
  ),
})

type SortKey = 'added' | 'name' | 'type'

const SORT_OPTIONS = [
  { value: 'added', label: 'Added' },
  { value: 'name', label: 'Name' },
  { value: 'type', label: 'Type' },
] as const

function GearPage() {
  const collection = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/gear/' })
  const updateSearch = (
    values: Partial<typeof search>,
    options?: { readonly replace?: boolean },
  ) =>
    navigate({
      search: (current) => ({ ...current, ...values }),
      replace: options?.replace,
    })
  const handleSortChange = (sort: SortKey) =>
    updateSearch({
      sort,
      direction: nextSortDirection(search.sort, search.direction, sort),
      activePage: 1,
      archivedPage: 1,
    })

  const activeGear = collection.active.items
  const archivedGear = collection.archived.items

  return (
    <Page>
      <PageHeader
        title="Gear"
        description="Keep track of the equipment you use to brew."
        help="Gear includes brewers, espresso machines, grinders, baskets, and other equipment. Save it once, then attach it to brews directly or through a gear set."
      />

      <CollectionToolbar
        value={search.query}
        onValueChange={(query) =>
          updateSearch(
            { query, activePage: 1, archivedPage: 1 },
            { replace: true },
          )
        }
        placeholder="Search gear…"
        ariaLabel="Search gear by name, brand, or model"
        resultLabel={`${collection.totalItems} ${collection.totalItems === 1 ? 'gear item' : 'gear items'}`}
        filters={(idSuffix) => (
          <CollectionSortControl
            id={`gear-sort${idSuffix}`}
            options={SORT_OPTIONS}
            sort={search.sort}
            direction={search.direction}
            onSortChange={handleSortChange}
            onDirectionToggle={() =>
              updateSearch({
                direction: search.direction === 'asc' ? 'desc' : 'asc',
                activePage: 1,
                archivedPage: 1,
              })
            }
          />
        )}
        actions={
          <Button asChild>
            <Link to="/gear/new">
              <Plus aria-hidden className="h-4 w-4" />
              Add gear
            </Link>
          </Button>
        }
        mobileSearchActions={
          <Button asChild size="icon">
            <Link to="/gear/new" aria-label="Add gear">
              <Plus aria-hidden />
            </Link>
          </Button>
        }
      />

      {collection.totalItems === 0 && !search.query ? (
        <EmptyState
          icon={Cog}
          title="No gear added yet"
          description="Add your first brewer, grinder, or other piece of equipment."
          actionLabel="Add gear"
          actionHref="/gear/new"
        />
      ) : (
        <div className="space-y-4">
          {collection.totalItems === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No gear matches “{search.query}”.
            </p>
          ) : (
            <>
              {collection.active.totalItems > 0 && (
                <section className="space-y-3">
                  <div className="@container">
                    <div
                      className={cn(
                        'grid gap-3 sm:grid-cols-2 sm:gap-4',
                        activeGear.length > 2 && 'lg:grid-cols-3',
                      )}
                    >
                      {activeGear.map((item) => (
                        <GearCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                  {collection.active.totalPages > 1 && (
                    <PaginationControls
                      page={collection.active.page}
                      totalPages={collection.active.totalPages}
                      onPageChange={(activePage) =>
                        updateSearch({ activePage })
                      }
                    />
                  )}
                </section>
              )}

              {collection.active.totalItems === 0 &&
                collection.archived.totalItems > 0 && (
                  <p className="text-muted-foreground">
                    No active gear. Check the archived section below.
                  </p>
                )}

              {collection.archived.totalItems > 0 && (
                <Collapsible className="space-y-4">
                  <CollapsibleTrigger className="group -mx-2 flex min-h-11 items-center gap-2 rounded-md px-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[open]:rotate-180" />
                    <span className="text-sm font-medium">
                      Archived ({collection.archived.totalItems})
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3">
                    <div className="@container">
                      <div
                        className={cn(
                          'grid gap-3 sm:grid-cols-2 sm:gap-4',
                          archivedGear.length > 2 && 'lg:grid-cols-3',
                        )}
                      >
                        {archivedGear.map((item) => (
                          <GearCard key={item.id} item={item} />
                        ))}
                      </div>
                    </div>
                    {collection.archived.totalPages > 1 && (
                      <PaginationControls
                        page={collection.archived.page}
                        totalPages={collection.archived.totalPages}
                        onPageChange={(archivedPage) =>
                          updateSearch({ archivedPage })
                        }
                      />
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </>
          )}
        </div>
      )}
    </Page>
  )
}

function GearCard({
  item,
}: {
  item: Awaited<ReturnType<typeof getGearPage>>['active']['items'][number]
}) {
  const thumbnail = item.images.find((img) => img.isThumbnail) ?? item.images[0]

  return (
    <Link
      to="/gear/$gearId"
      params={{ gearId: String(item.id) }}
      className={interactiveCardLinkClassName}
    >
      <Card className="h-full overflow-hidden pt-0 transition-colors group-hover:bg-muted/50">
        {thumbnail && (
          <div className="aspect-[4/3] overflow-hidden">
            <ImageWithFallback
              src={imageUrl(thumbnail.storagePath)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="min-w-0 text-base">{item.name}</CardTitle>
            <Badge variant="outline" className="shrink-0 text-xs">
              {GEAR_TYPE_LABELS[item.type]}
            </Badge>
          </div>
          {(item.brand || item.model) && (
            <p className="text-sm text-muted-foreground">
              {[item.brand, item.model].filter(Boolean).join(' ')}
            </p>
          )}
        </CardHeader>
        {item.notes && (
          <CardContent>
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {item.notes}
            </p>
          </CardContent>
        )}
      </Card>
    </Link>
  )
}
