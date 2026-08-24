import {
  createFileRoute,
  Link,
  stripSearchParams,
  useNavigate,
} from '@tanstack/react-router'
import { Plus, Store } from 'lucide-react'
import {
  type CollectionColumn,
  type CollectionEntry,
  CollectionList,
} from '@/components/collection/collection-list'
import { CollectionViewToggle } from '@/components/collection/collection-view-toggle'
import { CollectionToolbar } from '@/components/collection-toolbar'
import { EmptyState } from '@/components/EmptyState'
import { Page, PageHeader } from '@/components/page-layout'
import { PaginationControls } from '@/components/pagination-controls'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WebsiteLogo } from '@/components/website-logo'
import { useCollectionView } from '@/hooks/use-collection-view'
import {
  searchEnum,
  searchInteger,
  searchRecord,
  searchString,
  searchValidator,
} from '@/lib/search-params'
import { getRoasterPage } from '@/lib/server/roasters'

const parseRoasterSearch = (input: unknown) => {
  const search = searchRecord(input)
  return {
    page: searchInteger(search.page, 1, 1) ?? 1,
    query: searchString(search.query),
    sort: searchEnum(search.sort, ['name', 'location', 'beans'], 'name'),
    direction: searchEnum(search.direction, ['asc', 'desc'], 'asc'),
  }
}

export const Route = createFileRoute('/roasters/')({
  validateSearch: searchValidator(parseRoasterSearch),
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
  loader: ({ deps }) => getRoasterPage({ data: deps }),
  staleTime: 15_000,
  component: RoastersPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

type Roaster = Awaited<ReturnType<typeof getRoasterPage>>['items'][number]

type SortKey = 'name' | 'location' | 'beans'

function getRoasterLocation(roaster: Roaster): string {
  return [roaster.location, roaster.country].filter(Boolean).join(', ')
}

function toEntry(roaster: Roaster): CollectionEntry {
  return {
    id: roaster.id,
    title: roaster.name,
    subtitle: getRoasterLocation(roaster) || 'Location not set',
    meta: roaster.notes,
    media: {
      kind: 'custom',
      render: (sizeClassName) => (
        <WebsiteLogo
          entityType="roasters"
          entityId={roaster.id}
          website={roaster.website}
          updatedAt={roaster.updatedAt}
          className={sizeClassName}
        />
      ),
    },
    trailing: (
      <Badge variant="secondary">
        {roaster.beanCount} {roaster.beanCount === 1 ? 'bean' : 'beans'}
      </Badge>
    ),
    to: '/roasters/$roasterId',
    params: { roasterId: String(roaster.id) },
  }
}

function RoastersPage() {
  const pageData = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/roasters/' })
  const { view, setView, isReady } = useCollectionView('roasters')
  const updateSearch = (values: Partial<typeof search>) =>
    navigate({ search: (current) => ({ ...current, ...values }) })
  const handleSort = (key: string) =>
    updateSearch({
      sort: key as SortKey,
      direction:
        search.sort === key
          ? search.direction === 'asc'
            ? 'desc'
            : 'asc'
          : 'asc',
      page: 1,
    })

  const columns: readonly CollectionColumn<Roaster>[] = [
    {
      key: 'location',
      header: 'Location',
      sortKey: 'location',
      cell: (roaster) => getRoasterLocation(roaster) || '—',
    },
    {
      key: 'beans',
      header: 'Beans',
      align: 'right',
      sortKey: 'beans',
      cell: (roaster) =>
        roaster.beanCount > 0 ? (
          <Badge variant="secondary">{roaster.beanCount}</Badge>
        ) : (
          '—'
        ),
    },
    {
      key: 'notes',
      header: 'Notes',
      cellClassName: 'max-w-[420px] truncate',
      cell: (roaster) => roaster.notes || '—',
    },
  ]

  return (
    <Page>
      <PageHeader
        title="Roasters"
        description="Coffee roasters you buy from"
        actions={
          <Button asChild>
            <Link to="/roasters/new">
              <Plus className="h-4 w-4" />
              Add roaster
            </Link>
          </Button>
        }
      />

      {pageData.totalItems === 0 && !search.query ? (
        <EmptyState
          icon={Store}
          title="No roasters added yet"
          description="Start by adding your favorite coffee roasters"
          actionLabel="Add roaster"
          actionHref="/roasters/new"
        />
      ) : (
        <div className="space-y-4">
          <CollectionToolbar
            value={search.query}
            onValueChange={(query) => updateSearch({ query, page: 1 })}
            placeholder="Search roasters…"
            ariaLabel="Search roasters"
            resultLabel={`${pageData.totalItems} ${pageData.totalItems === 1 ? 'roaster' : 'roasters'}`}
            actions={
              <CollectionViewToggle
                value={view}
                onValueChange={setView}
                disabled={!isReady}
                label="Roaster list view"
              />
            }
          />

          {pageData.totalItems === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No roasters match “{search.query}”.
            </p>
          ) : (
            <CollectionList
              view={view}
              items={pageData.items}
              getEntry={toEntry}
              columns={columns}
              titleSortKey="name"
              sort={{
                key: search.sort,
                direction: search.direction,
                onSort: handleSort,
              }}
            />
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
