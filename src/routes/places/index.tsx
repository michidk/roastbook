import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { MapPin, Plus } from 'lucide-react'
import { z } from 'zod'
import { CoffeeShopCard } from '@/components/coffee-shops/coffee-shop-card'
import { CollectionToolbar } from '@/components/collection-toolbar'
import { EmptyState } from '@/components/EmptyState'
import { Page, PageHeader } from '@/components/page-layout'
import { PaginationControls } from '@/components/pagination-controls'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import { Button } from '@/components/ui/button'
import { getCoffeeShopPage } from '@/lib/server/coffee-shops'

const placesSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
  query: z.string().max(200).default('').catch(''),
})

export const Route = createFileRoute('/places/')({
  validateSearch: placesSearchSchema,
  loaderDeps: ({ search }) => ({ page: search.page, query: search.query }),
  loader: ({ deps }) => getCoffeeShopPage({ data: deps }),
  staleTime: 15_000,
  component: PlacesPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

function PlacesPage() {
  const pageData = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/places/' })
  const coffeeShops = pageData.items
  const updateSearch = (values: Partial<typeof search>) =>
    navigate({ search: (current) => ({ ...current, ...values }) })

  return (
    <Page>
      <PageHeader
        title="Cafés"
        description={
          <>
            Manage {pageData.totalItems} saved{' '}
            {pageData.totalItems === 1 ? 'café' : 'cafés'}
          </>
        }
        actions={
          <Button asChild>
            <Link to="/shops/new">
              <Plus aria-hidden className="h-4 w-4" />
              Add café
            </Link>
          </Button>
        }
      />

      <CollectionToolbar
        value={search.query}
        onValueChange={(query) => updateSearch({ query, page: 1 })}
        placeholder="Search cafés…"
        ariaLabel="Search cafés"
        resultLabel={`${pageData.totalItems} ${pageData.totalItems === 1 ? 'café' : 'cafés'}`}
      />

      {pageData.totalItems === 0 && !search.query ? (
        <EmptyState
          icon={MapPin}
          title="No cafés added yet"
          description="Add the cafés you want to remember"
          actionLabel="Add café"
          actionHref="/shops/new"
        />
      ) : pageData.totalItems === 0 ? (
        <p className="text-sm text-muted-foreground">
          No cafés match “{search.query}”.
        </p>
      ) : (
        <>
          <div className="@container">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {coffeeShops.map((coffeeShop) => (
                <CoffeeShopCard key={coffeeShop.id} coffeeShop={coffeeShop} />
              ))}
            </div>
          </div>
          {pageData.totalPages > 1 && (
            <PaginationControls
              page={pageData.page}
              totalPages={pageData.totalPages}
              onPageChange={(page) => updateSearch({ page })}
            />
          )}
        </>
      )}
    </Page>
  )
}
