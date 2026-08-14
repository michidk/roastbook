import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Bean, ChevronDown, Plus } from 'lucide-react'
import { z } from 'zod'
import { BeanCard } from '@/components/beans/bean-card'
import { CollectionToolbar } from '@/components/collection-toolbar'
import { EmptyState } from '@/components/EmptyState'
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
import { getBeanCollection } from '@/lib/server/beans'

const beanSearchSchema = z.object({
  activePage: z.number().int().min(1).default(1).catch(1),
  archivedPage: z.number().int().min(1).default(1).catch(1),
  query: z.string().max(200).default('').catch(''),
})

export const Route = createFileRoute('/beans/')({
  validateSearch: beanSearchSchema,
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
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
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
    options?: { readonly replace?: boolean },
  ) =>
    navigate({
      search: (current) => ({ ...current, ...values }),
      replace: options?.replace,
    })

  return (
    <Page>
      <PageHeader
        title="Beans"
        description="Your coffee bean collection"
        actions={
          <Button asChild>
            <Link to="/beans/new">
              <Plus className="h-4 w-4" />
              Add beans
            </Link>
          </Button>
        }
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
      />

      {collection.totalItems === 0 && !search.query ? (
        <EmptyState
          icon={Bean}
          title="No beans added yet"
          description="Start by adding your first bag of coffee"
          actionLabel="Add beans"
          actionHref="/beans/new"
        />
      ) : (
        <>
          {collection.active.totalItems > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Active · {collection.active.totalItems}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {activeBeans.map((bean) => (
                  <BeanCard key={bean.id} bean={bean} />
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
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedBeans.map((bean) => (
                    <BeanCard key={bean.id} bean={bean} />
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
            <p className="text-sm text-muted-foreground">
              No beans match “{search.query}”.
            </p>
          )}
        </>
      )}
    </Page>
  )
}
