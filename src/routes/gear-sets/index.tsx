import {
  createFileRoute,
  Link,
  stripSearchParams,
  useNavigate,
} from '@tanstack/react-router'
import { Layers, Plus } from 'lucide-react'
import { CollectionToolbar } from '@/components/collection-toolbar'
import { EmptyState } from '@/components/empty-state'
import { CollectionSortControl } from '@/components/gear/collection-sort-control'
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
import { nextSortDirection } from '@/lib/collection-sort'
import {
  searchEnum,
  searchInteger,
  searchRecord,
  searchString,
  searchValidator,
} from '@/lib/search-params'
import { getGearSetPage } from '@/lib/server/gear-sets'
import { cn } from '@/lib/utils'

const parseGearSetSearch = (input: unknown) => {
  const search = searchRecord(input)
  return {
    page: searchInteger(search.page, 1, 1) ?? 1,
    query: searchString(search.query),
    sort: searchEnum(search.sort, ['name', 'added'], 'name'),
    direction: searchEnum(search.direction, ['asc', 'desc'], 'asc'),
  }
}

export const Route = createFileRoute('/gear-sets/')({
  validateSearch: searchValidator(parseGearSetSearch),
  search: {
    middlewares: [
      stripSearchParams({
        page: 1,
        query: '',
        sort: 'name',
        direction: 'asc',
      } as const),
    ],
  },
  loaderDeps: ({ search }) => ({
    page: search.page,
    query: search.query,
    sort: search.sort,
    direction: search.direction,
  }),
  loader: ({ deps }) => getGearSetPage({ data: deps }),
  staleTime: 15_000,
  component: GearSetsPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/overview" backLabel="Go to overview" />
  ),
})

type SortKey = 'name' | 'added'

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'added', label: 'Added' },
] as const

function GearSetsPage() {
  const pageData = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/gear-sets/' })
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
      page: 1,
    })

  return (
    <Page>
      <PageHeader
        title="Gear sets"
        description="Save equipment combinations you regularly brew with."
        help="Gear sets group equipment you use together, such as your home, work, or travel setup. Load a set into a new brew to fill its equipment with one tap."
      />

      <CollectionToolbar
        value={search.query}
        onValueChange={(query) =>
          updateSearch({ query, page: 1 }, { replace: true })
        }
        placeholder="Search gear sets…"
        ariaLabel="Search gear sets"
        resultLabel={`${pageData.totalItems} ${pageData.totalItems === 1 ? 'gear set' : 'gear sets'}`}
        filters={(idSuffix) => (
          <CollectionSortControl
            id={`gear-set-sort${idSuffix}`}
            options={SORT_OPTIONS}
            sort={search.sort}
            direction={search.direction}
            onSortChange={handleSortChange}
            onDirectionToggle={() =>
              updateSearch({
                direction: search.direction === 'asc' ? 'desc' : 'asc',
                page: 1,
              })
            }
          />
        )}
        actions={
          <Button asChild>
            <Link to="/gear-sets/new">
              <Plus aria-hidden className="h-4 w-4" />
              Add gear set
            </Link>
          </Button>
        }
        mobileSearchActions={
          <Button asChild size="icon">
            <Link to="/gear-sets/new" aria-label="Add gear set">
              <Plus aria-hidden />
            </Link>
          </Button>
        }
      />

      {pageData.totalItems === 0 && !search.query ? (
        <EmptyState
          icon={Layers}
          title="No gear sets yet"
          description="Create your first set to reuse a familiar equipment setup."
          actionLabel="Add gear set"
          actionHref="/gear-sets/new"
        />
      ) : (
        <div className="space-y-4">
          {pageData.totalItems === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No gear sets match “{search.query}”.
            </p>
          ) : (
            <div className="@container">
              <div
                className={cn(
                  'grid gap-3 sm:grid-cols-2 sm:gap-4',
                  pageData.items.length > 2 && 'lg:grid-cols-3',
                )}
              >
                {pageData.items.map((gearSet) => (
                  <GearSetCard key={gearSet.id} gearSet={gearSet} />
                ))}
              </div>
            </div>
          )}

          {pageData.totalPages > 1 && (
            <PaginationControls
              page={pageData.page}
              totalPages={pageData.totalPages}
              onPageChange={(page) => updateSearch({ page })}
            />
          )}
        </div>
      )}
    </Page>
  )
}

function GearSetCard({
  gearSet,
}: {
  gearSet: Awaited<ReturnType<typeof getGearSetPage>>['items'][number]
}) {
  const members = [
    gearSet.machine,
    gearSet.grinder,
    gearSet.basket,
    ...gearSet.accessoryGear,
  ].filter((member) => member !== null)

  return (
    <Link
      to="/gear-sets/$gearSetId"
      params={{ gearSetId: String(gearSet.id) }}
      className={interactiveCardLinkClassName}
    >
      <Card className="h-full transition-colors group-hover:bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="min-w-0 text-base">{gearSet.name}</CardTitle>
          {gearSet.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {gearSet.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {members.map((member) => (
                <Badge
                  key={member.id}
                  variant="outline"
                  className="max-w-full text-xs"
                >
                  <span className="truncate">{member.name}</span>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No gear selected</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
