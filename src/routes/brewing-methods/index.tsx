import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Coffee, Plus, Timer } from 'lucide-react'
import { z } from 'zod'
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
import { useCollectionView } from '@/hooks/use-collection-view'
import { getBrewingMethodPage } from '@/lib/server/brewing-methods'

const brewingMethodSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
  query: z.string().max(200).default('').catch(''),
})

export const Route = createFileRoute('/brewing-methods/')({
  validateSearch: brewingMethodSearchSchema,
  loaderDeps: ({ search }) => ({ page: search.page, query: search.query }),
  loader: ({ deps }) => getBrewingMethodPage({ data: deps }),
  staleTime: 15_000,
  component: BrewingMethodsPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

type BrewingMethod = Awaited<
  ReturnType<typeof getBrewingMethodPage>
>['items'][number]

function fieldCountLabel(method: BrewingMethod): string {
  const count = method.enabledParameters.length
  return `${count} logging field${count === 1 ? '' : 's'}`
}

function toEntry(method: BrewingMethod): CollectionEntry {
  return {
    id: method.id,
    title: method.name,
    subtitle: method.description ?? 'No description',
    meta: fieldCountLabel(method),
    media: { kind: 'icon', icon: Coffee },
    flags: method.timerEnabled ? (
      <Timer aria-label="Timer enabled" className="size-3.5 text-primary" />
    ) : null,
    to: '/brewing-methods/$brewingMethodId',
    params: { brewingMethodId: String(method.id) },
  }
}

function BrewingMethodsPage() {
  const pageData = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/brewing-methods/' })
  const { view, setView, isReady } = useCollectionView('brewing-methods')
  const updateSearch = (values: Partial<typeof search>) =>
    navigate({ search: (current) => ({ ...current, ...values }) })

  const columns: readonly CollectionColumn<BrewingMethod>[] = [
    {
      key: 'description',
      header: 'Description',
      cellClassName: 'max-w-[380px] truncate',
      cell: (method) => method.description || '—',
    },
    {
      key: 'fields',
      header: 'Fields',
      align: 'right',
      cell: (method) => method.enabledParameters.length || '—',
    },
    {
      key: 'timer',
      header: 'Timer',
      cell: (method) =>
        method.timerEnabled ? <Badge variant="secondary">On</Badge> : '—',
    },
    {
      key: 'usage',
      header: 'Used by',
      cell: (method) =>
        method.recipeCount + method.shotCount > 0
          ? `${method.recipeCount} ${method.recipeCount === 1 ? 'recipe' : 'recipes'} · ${method.shotCount} ${method.shotCount === 1 ? 'shot' : 'shots'}`
          : 'Not used yet',
    },
  ]

  return (
    <Page>
      <PageHeader
        title="Brewing methods"
        description="Define each method and the brew parameters it uses. Recipes and brews always belong to one method."
        actions={
          <Button asChild>
            <Link to="/brewing-methods/new">
              <Plus aria-hidden className="h-4 w-4" />
              Add method
            </Link>
          </Button>
        }
      />

      {pageData.totalItems === 0 && !search.query ? (
        <EmptyState
          icon={Coffee}
          title="No brewing methods yet"
          description="Add the methods you brew with so shots and recipes can use them"
          actionLabel="Add method"
          actionHref="/brewing-methods/new"
        />
      ) : (
        <div className="space-y-4">
          <CollectionToolbar
            value={search.query}
            onValueChange={(query) => updateSearch({ query, page: 1 })}
            placeholder="Search brewing methods…"
            ariaLabel="Search brewing methods"
            resultLabel={`${pageData.totalItems} ${pageData.totalItems === 1 ? 'method' : 'methods'}`}
            actions={
              <CollectionViewToggle
                value={view}
                onValueChange={setView}
                disabled={!isReady}
                label="Brewing method list view"
              />
            }
          />

          {pageData.totalItems === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No brewing methods match “{search.query}”.
            </p>
          ) : (
            <CollectionList
              view={view}
              items={pageData.items}
              getEntry={toEntry}
              columns={columns}
              titleHeader="Method"
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
