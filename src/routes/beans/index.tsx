import {
  createFileRoute,
  Link,
  stripSearchParams,
  useNavigate,
} from '@tanstack/react-router'
import { Bean, ChevronDown, Plus } from 'lucide-react'
import { BeanCard } from '@/components/beans/bean-card'
import { CollectionToolbar } from '@/components/collection-toolbar'
import { EmptyState } from '@/components/empty-state'
import { Page, PageHeader } from '@/components/page-layout'
import { PaginationControls } from '@/components/pagination-controls'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  searchInteger,
  searchRecord,
  searchString,
  searchValidator,
} from '@/lib/search-params'
import { getBeanCollection } from '@/lib/server/beans'

const parseBeanSearch = (input: unknown) => {
  const search = searchRecord(input)
  return {
    activePage: searchInteger(search.activePage, 1, 1) ?? 1,
    archivedPage: searchInteger(search.archivedPage, 1, 1) ?? 1,
    query: searchString(search.query),
  }
}

export const Route = createFileRoute('/beans/')({
  validateSearch: searchValidator(parseBeanSearch),
  search: {
    middlewares: [
      stripSearchParams({ activePage: 1, archivedPage: 1, query: '' } as const),
    ],
  },
  loaderDeps: ({ search }) => ({
    activePage: search.activePage,
    archivedPage: search.archivedPage,
    query: search.query,
  }),
  loader: ({ deps }) => getBeanCollection({ data: deps }),
  staleTime: 15_000,
  component: BeansPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/overview" backLabel="Go to overview" />
  ),
})

function BeansPage() {
  const collection = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/beans/' })
  const activeBeans = collection.active.items
  const archivedBeans = collection.archived.items
  const updateSearch = (
    values: Partial<typeof search>,
    options?: { replace?: boolean },
  ) =>
    navigate({
      search: (current) => ({ ...current, ...values }),
      replace: options?.replace,
    })

  return (
    <Page>
      <PageHeader
        title="Beans"
        description="Keep track of the coffee beans you brew."
        help="Beans represent the coffees in your collection. Save their roaster, origin, process, roast details, and tasting notes, then select them when you log a brew."
      />

      <CollectionToolbar
        value={search.query}
        onValueChange={(query) =>
          updateSearch(
            { query, activePage: 1, archivedPage: 1 },
            { replace: true },
          )
        }
        placeholder="Search beans…"
        ariaLabel="Search beans"
        resultLabel={`${collection.totalItems} ${collection.totalItems === 1 ? 'bag' : 'bags'}`}
        actions={
          <Button asChild>
            <Link to="/beans/new">
              <Plus aria-hidden className="h-4 w-4" />
              Add beans
            </Link>
          </Button>
        }
        mobileSearchActions={
          <Button asChild size="icon">
            <Link to="/beans/new" aria-label="Add beans">
              <Plus aria-hidden />
            </Link>
          </Button>
        }
      />

      {collection.totalItems === 0 && !search.query ? (
        <EmptyState
          icon={Bean}
          title="No beans added yet"
          description="Add your first coffee to start building your bean collection."
          actionLabel="Add beans"
          actionHref="/beans/new"
        />
      ) : (
        <>
          {collection.active.totalItems > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                Active · {collection.active.totalItems}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {activeBeans.map((bean) => (
                  <BeanCard
                    key={bean.id}
                    bean={bean}
                    compact
                    showRemainingEstimate
                  />
                ))}
              </div>
              {collection.active.totalPages > 1 && (
                <PaginationControls
                  page={collection.active.page}
                  totalPages={collection.active.totalPages}
                  onPageChange={(activePage) => updateSearch({ activePage })}
                />
              )}
            </section>
          )}

          {collection.active.totalItems === 0 &&
            collection.archived.totalItems > 0 && (
              <p className="text-sm text-muted-foreground">
                No active beans. Check the archived section below.
              </p>
            )}

          {collection.archived.totalItems > 0 && (
            <Collapsible className="space-y-4">
              <CollapsibleTrigger className="group -mx-2 flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ChevronDown className="h-4 w-4 transition-transform group-data-[open]:rotate-180" />
                Archived ({collection.archived.totalItems})
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {archivedBeans.map((bean) => (
                    <BeanCard key={bean.id} bean={bean} compact />
                  ))}
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
          {collection.totalItems === 0 && search.query && (
            <p className="py-4 text-sm text-muted-foreground">
              No beans match “{search.query}”.
            </p>
          )}
        </>
      )}
    </Page>
  )
}
