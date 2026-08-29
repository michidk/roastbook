import {
  createFileRoute,
  Link,
  stripSearchParams,
  useNavigate,
} from '@tanstack/react-router'
import { Plus, UtensilsCrossed } from 'lucide-react'
import { CollectionToolbar } from '@/components/collection-toolbar'
import { EmptyState } from '@/components/empty-state'
import { Page, PageHeader } from '@/components/page-layout'
import { PaginationControls } from '@/components/pagination-controls'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import { Button } from '@/components/ui/button'
import { interactiveCardLinkClassName } from '@/components/ui/card'
import { StarRating } from '@/components/ui/star-rating'
import { WebsiteLogo } from '@/components/website-logo'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { useTasteProfile } from '@/hooks/use-taste-profile'
import {
  searchInteger,
  searchRecord,
  searchString,
  searchValidator,
} from '@/lib/search-params'
import { getCafeVisitPage } from '@/lib/server/cafe-visits'
import { isNegativeTasteTag } from '@/lib/taste-tags'

const parseVisitSearch = (input: unknown) => {
  const search = searchRecord(input)
  return {
    page: searchInteger(search.page, 1, 1) ?? 1,
    query: searchString(search.query),
  }
}

export const Route = createFileRoute('/visits/')({
  validateSearch: searchValidator(parseVisitSearch),
  search: {
    middlewares: [stripSearchParams({ page: 1, query: '' } as const)],
  },
  loaderDeps: ({ search }) => ({
    page: search.page,
    query: search.query,
  }),
  loader: ({ deps }) => getCafeVisitPage({ data: deps }),
  staleTime: 15_000,
  component: VisitsPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/overview" backLabel="Go to overview" />
  ),
})

type Visit = Awaited<ReturnType<typeof getCafeVisitPage>>['items'][number]

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
        {title} · {count}
      </h2>
    </div>
  )
}

function VisitsPage() {
  const visitPage = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/visits/' })
  const visits = visitPage.items
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
        title="Café visits"
        description="Remember the coffees and cafés you experience."
        help="Café visits capture what you ordered, where you went, what it cost, and how it tasted. Use them as a personal history of coffee experiences away from home."
        actions={
          <Button asChild>
            <Link to="/visits/new" search={{ coffeeShopId: undefined }}>
              <Plus className="h-4 w-4" />
              Log a visit
            </Link>
          </Button>
        }
      />

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
            description="Log your first visit to start your café experience history."
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
    </Page>
  )
}

function VisitCard({ visit }: { visit: Visit }) {
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const tasteProfile = useTasteProfile()
  const date = formatDate(visit.visitedAt)
  const visitTags = tasteProfile.flavorTags ? (visit.tasteTags ?? []) : []
  const positiveTags = visitTags.filter(
    (tt) => !isNegativeTasteTag(tt.tasteTag),
  )
  const negativeTags = visitTags.filter((tt) => isNegativeTasteTag(tt.tasteTag))

  return (
    <Link
      to="/visits/$visitId"
      params={{ visitId: String(visit.id) }}
      className={`${interactiveCardLinkClassName} bg-card p-5 shadow-coffee`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {visit.coffeeShop ? (
            <WebsiteLogo
              entityType="coffee-shops"
              entityId={visit.coffeeShop.id}
              website={visit.coffeeShop.website}
              updatedAt={visit.coffeeShop.updatedAt}
              className="size-10 rounded-full p-1"
            />
          ) : null}
          <div className="min-w-0">
            <p className="font-display text-lg font-bold text-foreground">
              {visit.drinkName || 'Coffee'}
            </p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {visit.coffeeShop?.name ?? 'Unknown café'} · {date}
            </p>
          </div>
        </div>
        {visit.drinkType && (
          <span className="shrink-0 rounded-xl bg-coffee px-2.5 py-1 text-xs font-bold text-coffee-foreground">
            {visit.drinkType}
          </span>
        )}
      </div>

      {tasteProfile.overallRating && visit.rating != null && (
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
