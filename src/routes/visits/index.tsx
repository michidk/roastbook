import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  History,
  Map as MapIcon,
  Plus,
  Store,
  UtensilsCrossed,
} from 'lucide-react'
import { z } from 'zod'
import { CoffeeShopCard } from '@/components/coffee-shops/coffee-shop-card'
import { CoffeeShopMap } from '@/components/coffee-shops/coffee-shop-map'
import { CollectionToolbar } from '@/components/collection-toolbar'
import { EmptyState } from '@/components/EmptyState'
import { Page, PageHeader } from '@/components/page-layout'
import { PaginationControls } from '@/components/pagination-controls'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import { Button } from '@/components/ui/button'
import { interactiveCardLinkClassName } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StarRating } from '@/components/ui/star-rating'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { getCafeVisitPage } from '@/lib/server/cafe-visits'
import { getCoffeeShopMapOverview } from '@/lib/server/coffee-shops'
import { isNegativeTasteTag } from '@/lib/taste-tags'

const visitSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
  query: z.string().max(200).default('').catch(''),
  view: z.enum(['history', 'map']).default('history').catch('history'),
})

export const Route = createFileRoute('/visits/')({
  validateSearch: visitSearchSchema,
  loaderDeps: ({ search }) => ({
    page: search.page,
    query: search.query,
    view: search.view,
  }),
  loader: async ({ deps }) => {
    const [visitPage, coffeeShops] = await Promise.all([
      getCafeVisitPage({ data: { page: deps.page, query: deps.query } }),
      deps.view === 'map' ? getCoffeeShopMapOverview() : Promise.resolve([]),
    ])
    return { visitPage, coffeeShops }
  },
  staleTime: 15_000,
  component: VisitsPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

type Visit = Awaited<ReturnType<typeof getCafeVisitPage>>['items'][number]

const RECENT_PLACES_LIMIT = 6

function SectionHeading({
  title,
  count,
  action,
}: {
  title: string
  count: number
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {title} · {count}
      </h2>
      {action}
    </div>
  )
}

function VisitsPage() {
  const { visitPage, coffeeShops } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/visits/' })
  const visits = visitPage.items
  const featuredCoffeeShops = [
    ...coffeeShops.filter((shop) => shop.isFavorite),
    ...coffeeShops.filter((shop) => !shop.isFavorite && shop.wantsToVisit),
    ...coffeeShops
      .filter(
        (shop) =>
          !shop.isFavorite && !shop.wantsToVisit && shop.latestVisitAt !== null,
      )
      .slice(0, RECENT_PLACES_LIMIT),
  ].slice(0, RECENT_PLACES_LIMIT)
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
        title="Café visits"
        description="Your coffee experiences out and about"
        actions={
          <Button asChild>
            <Link to="/visits/new" search={{ coffeeShopId: undefined }}>
              <Plus className="h-4 w-4" />
              Log a visit
            </Link>
          </Button>
        }
      />

      <nav className="flex gap-2" aria-label="Café visit views">
        <Button
          asChild
          variant={search.view === 'history' ? 'primary' : 'outline'}
        >
          <Link
            from="/visits/"
            search={(current) => ({ ...current, view: 'history', page: 1 })}
          >
            <History aria-hidden="true" />
            History
          </Link>
        </Button>
        <Button asChild variant={search.view === 'map' ? 'primary' : 'outline'}>
          <Link
            from="/visits/"
            search={(current) => ({ ...current, view: 'map' })}
          >
            <MapIcon aria-hidden="true" />
            Map
          </Link>
        </Button>
      </nav>

      {search.view === 'history' ? (
        <section className="space-y-3">
          <SectionHeading title="Visit history" count={visitPage.totalItems} />

          <CollectionToolbar
            value={search.query}
            onValueChange={(query) =>
              updateSearch({ query, page: 1 }, { replace: true })
            }
            placeholder="Search visits…"
            ariaLabel="Search visits"
            resultLabel={`${visitPage.totalItems} ${visitPage.totalItems === 1 ? 'visit' : 'visits'}`}
          />

          {visitPage.totalItems === 0 && !search.query ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No visits logged yet"
              description="Track your café visits and coffee experiences"
              actionLabel="Log a visit"
              actionHref="/visits/new"
              actionSearch={{ coffeeShopId: undefined }}
            />
          ) : visitPage.totalItems === 0 ? (
            <p className="text-sm text-muted-foreground">
              No visits match “{search.query}”.
            </p>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visits.map((visit) => (
                  <VisitCard key={visit.id} visit={visit} />
                ))}
              </div>
              {visitPage.totalPages > 1 && (
                <PaginationControls
                  page={visitPage.page}
                  totalPages={visitPage.totalPages}
                  onPageChange={(page) => updateSearch({ page })}
                />
              )}
            </>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <SectionHeading
            title="Café map"
            count={coffeeShops.length}
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/places">
                  <Store aria-hidden className="h-4 w-4" />
                  Manage all cafés
                </Link>
              </Button>
            }
          />
          <div className="grid items-stretch gap-4 lg:grid-cols-4">
            <div className="min-w-0 lg:col-span-3">
              <CoffeeShopMap coffeeShops={coffeeShops} />
            </div>

            {featuredCoffeeShops.length > 0 && (
              <aside className="min-w-0 space-y-3 lg:col-span-1 lg:flex lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-3">
                <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Quick picks · {featuredCoffeeShops.length}
                </h3>
                <ScrollArea className="lg:h-[540px]">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:pr-3">
                    {featuredCoffeeShops.map((coffeeShop) => (
                      <CoffeeShopCard
                        key={coffeeShop.id}
                        coffeeShop={coffeeShop}
                        emphasizeFavorite
                      />
                    ))}
                  </div>
                </ScrollArea>
              </aside>
            )}
          </div>
        </section>
      )}
    </Page>
  )
}

function VisitCard({ visit }: { visit: Visit }) {
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const date = formatDate(visit.visitedAt)
  const positiveTags =
    visit.tasteTags?.filter((tt) => !isNegativeTasteTag(tt.tasteTag)) ?? []
  const negativeTags =
    visit.tasteTags?.filter((tt) => isNegativeTasteTag(tt.tasteTag)) ?? []

  return (
    <Link
      to="/visits/$visitId"
      params={{ visitId: String(visit.id) }}
      className={`${interactiveCardLinkClassName} bg-card p-5 shadow-coffee`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-foreground">
            {visit.drinkName || 'Coffee'}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {visit.coffeeShop?.name ?? 'Unknown café'} · {date}
          </p>
        </div>
        {visit.drinkType && (
          <span className="shrink-0 rounded-xl bg-coffee px-2.5 py-1 text-xs font-bold text-coffee-foreground">
            {visit.drinkType}
          </span>
        )}
      </div>

      {visit.rating != null && (
        <StarRating
          value={visit.rating}
          readOnly
          variant="compact"
          sizeClassName="size-4"
          className="mt-3"
          ariaLabel="Visit rating"
        />
      )}

      {(visit.bean || visit.price) && (
        <p className="mt-3 text-sm text-muted-foreground">
          {visit.bean && (
            <>
              Bean:{' '}
              <span className="font-bold text-foreground">
                {visit.bean.name}
              </span>
            </>
          )}
          {visit.bean && visit.price && ' · '}
          {visit.price && (
            <span className="font-bold text-foreground">
              {visit.currency || 'EUR'} {formatNumber(visit.price)}
            </span>
          )}
        </p>
      )}

      {(positiveTags.length > 0 || negativeTags.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {positiveTags.slice(0, 4).map((tt) => (
            <span
              key={tt.id}
              className="rounded-xl bg-positive/15 px-2.5 py-1 text-xs font-semibold text-positive-text"
            >
              {tt.tasteTag.name}
            </span>
          ))}
          {negativeTags.slice(0, 2).map((tt) => (
            <span
              key={tt.id}
              className="rounded-xl bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive-text"
            >
              {tt.tasteTag.name}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
