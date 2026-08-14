import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Plus, Store } from 'lucide-react'
import { z } from 'zod'
import { CollectionToolbar } from '@/components/collection-toolbar'
import { EmptyState } from '@/components/EmptyState'
import { Page, PageHeader } from '@/components/page-layout'
import { PaginationControls } from '@/components/pagination-controls'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import { SortableTableHead } from '@/components/sortable-table-head'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  interactiveCardLinkClassName,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getRoasterPage } from '@/lib/server/roasters'

const roasterSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
  query: z.string().max(200).default('').catch(''),
  sort: z.enum(['name', 'location', 'beans']).default('name').catch('name'),
  direction: z.enum(['asc', 'desc']).default('asc').catch('asc'),
})

export const Route = createFileRoute('/roasters/')({
  validateSearch: roasterSearchSchema,
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

function RoastersPage() {
  const pageData = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/roasters/' })
  const updateSearch = (values: Partial<typeof search>) =>
    navigate({ search: (current) => ({ ...current, ...values }) })
  const handleSort = (sort: SortKey) =>
    updateSearch({
      sort,
      direction:
        search.sort === sort
          ? search.direction === 'asc'
            ? 'desc'
            : 'asc'
          : 'asc',
      page: 1,
    })

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
          />

          {pageData.totalItems === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No roasters match “{search.query}”.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {pageData.items.map((roaster) => (
                  <RoasterMobileCard key={roaster.id} roaster={roaster} />
                ))}
              </div>
              <Card className="hidden md:flex">
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableTableHead
                          label="Name"
                          active={search.sort === 'name'}
                          direction={search.direction}
                          onSort={() => handleSort('name')}
                        />
                        <SortableTableHead
                          label="Location"
                          active={search.sort === 'location'}
                          direction={search.direction}
                          onSort={() => handleSort('location')}
                        />
                        <SortableTableHead
                          label="Beans"
                          align="right"
                          active={search.sort === 'beans'}
                          direction={search.direction}
                          onSort={() => handleSort('beans')}
                        />
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageData.items.map((roaster) => (
                        <RoasterRow
                          key={roaster.id}
                          roaster={roaster}
                          hasLocation
                          hasNotes
                        />
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
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

function RoasterRow({
  roaster,
  hasLocation,
  hasNotes,
}: {
  roaster: Roaster
  hasLocation: boolean
  hasNotes: boolean
}) {
  const beanCount = roaster.beanCount
  const location = getRoasterLocation(roaster)

  return (
    <TableRow>
      <TableCell className="font-display font-bold text-foreground">
        <Link
          to="/roasters/$roasterId"
          params={{ roasterId: String(roaster.id) }}
          className="inline-flex min-h-11 items-center rounded-sm text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {roaster.name}
        </Link>
      </TableCell>
      {hasLocation && (
        <TableCell className="text-muted-foreground">
          {location || '—'}
        </TableCell>
      )}
      <TableCell className="text-right">
        {beanCount > 0 ? (
          <Badge variant="secondary">{beanCount}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      {hasNotes && (
        <TableCell className="max-w-[420px] truncate text-muted-foreground">
          {roaster.notes || '—'}
        </TableCell>
      )}
    </TableRow>
  )
}

function RoasterMobileCard({ roaster }: { readonly roaster: Roaster }) {
  const location = getRoasterLocation(roaster)

  return (
    <Link
      to="/roasters/$roasterId"
      params={{ roasterId: String(roaster.id) }}
      className={interactiveCardLinkClassName}
    >
      <Card size="sm" className="h-full">
        <CardContent className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-base font-bold text-foreground">
              {roaster.name}
            </h2>
            <Badge variant="secondary">
              {roaster.beanCount} {roaster.beanCount === 1 ? 'bean' : 'beans'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {location || 'Location not set'}
          </p>
          {roaster.notes ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {roaster.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  )
}
