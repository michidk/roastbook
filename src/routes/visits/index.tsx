import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ChevronRight,
  Heart,
  MapPin,
  MapPinOff,
  Plus,
  Star,
  UtensilsCrossed,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/EmptyState"
import { CoffeeShopMap } from "@/components/coffee-shops/coffee-shop-map"
import { getCafeVisits } from "@/lib/server/cafe-visits"
import { getCoffeeShops } from "@/lib/server/coffee-shops"
import { RouteError } from "@/components/route-error"
import { ListPending } from "@/components/route-pending"

/**
 * Places and visits share one page: a visit is always at a place
 * (`cafeVisits.coffeeShopId`), so splitting them across two routes made you
 * navigate away just to answer "where was that?".
 */
export const Route = createFileRoute("/visits/")({
  loader: async () => {
    const [visits, coffeeShops] = await Promise.all([
      getCafeVisits(),
      getCoffeeShops(),
    ])
    return { visits, coffeeShops }
  },
  component: VisitsPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

type Visit = Awaited<ReturnType<typeof getCafeVisits>>[number]
type CoffeeShop = Awaited<ReturnType<typeof getCoffeeShops>>[number]

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
})

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
  const { visits, coffeeShops } = Route.useLoaderData()

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Café visits
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Your coffee experiences out and about
          </p>
        </div>
        <Button asChild>
          <Link to="/visits/new" search={{ coffeeShopId: undefined }}>
            <Plus className="h-4 w-4" />
            Log a visit
          </Link>
        </Button>
      </header>

      <section className="space-y-3">
        <SectionHeading
          title="Places"
          count={coffeeShops.length}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/coffee-shops/new">
                <Plus className="h-4 w-4" />
                Add a place
              </Link>
            </Button>
          }
        />

        {coffeeShops.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No places added yet"
            description="Add your favorite cafes and coffee spots"
            actionLabel="Add a place"
            actionHref="/coffee-shops/new"
          />
        ) : (
          <div className="space-y-4">
            <CoffeeShopMap
              coffeeShops={coffeeShops}
              heightClassName="h-[220px] md:h-[280px]"
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {coffeeShops.map((coffeeShop) => (
                <PlaceCard key={coffeeShop.id} coffeeShop={coffeeShop} />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeading title="Visits" count={visits.length} />

        {visits.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No visits logged yet"
            description="Track your cafe visits and coffee experiences"
            actionLabel="Log a visit"
            actionHref="/visits/new"
            actionSearch={{ coffeeShopId: undefined }}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visits.map((visit) => (
              <VisitCard key={visit.id} visit={visit} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function PlaceCard({ coffeeShop }: { coffeeShop: CoffeeShop }) {
  const hasCoordinates =
    coffeeShop.latitude !== null && coffeeShop.longitude !== null
  const LocationIcon = hasCoordinates ? MapPin : MapPinOff
  const location = [coffeeShop.city, coffeeShop.country]
    .filter(Boolean)
    .join(", ")

  return (
    <Link
      to="/coffee-shops/$coffeeShopId"
      params={{ coffeeShopId: String(coffeeShop.id) }}
      className="group flex items-center gap-3 rounded-3xl bg-card p-4 shadow-coffee transition-transform hover:-translate-y-0.5"
    >
      <span
        className={
          hasCoordinates
            ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            : "flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
        }
      >
        <LocationIcon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-display text-base font-bold text-foreground">
            {coffeeShop.name}
          </span>
          {coffeeShop.isFavorite && (
            <Heart className="size-3.5 shrink-0 fill-current text-destructive" />
          )}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {location || (hasCoordinates ? "Location pinned" : "No location set")}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
    </Link>
  )
}

function VisitCard({ visit }: { visit: Visit }) {
  const date = dateFormatter.format(new Date(visit.visitedAt))
  const positiveTags = visit.tasteTags?.filter((tt) => tt.tasteTag.category !== "negative") ?? []
  const negativeTags = visit.tasteTags?.filter((tt) => tt.tasteTag.category === "negative") ?? []

  return (
    <Link
      to="/visits/$visitId"
      params={{ visitId: String(visit.id) }}
      className="block rounded-3xl bg-card p-5 shadow-coffee transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-foreground">
            {visit.drinkName || "Coffee"}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {visit.coffeeShop?.name ?? "Unknown café"} · {date}
          </p>
        </div>
        {visit.drinkType && (
          <span className="shrink-0 rounded-xl bg-coffee px-2.5 py-1 text-xs font-bold text-coffee-foreground">
            {visit.drinkType}
          </span>
        )}
      </div>

      {visit.rating != null && (
        <div className="mt-3 flex items-center gap-0.5 text-primary">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className="h-4 w-4"
              fill={n <= (visit.rating ?? 0) ? "currentColor" : "transparent"}
              strokeWidth={1.5}
            />
          ))}
        </div>
      )}

      {(visit.bean || visit.price) && (
        <p className="mt-3 text-sm text-muted-foreground">
          {visit.bean && (
            <>
              Bean: <span className="font-bold text-foreground">{visit.bean.name}</span>
            </>
          )}
          {visit.bean && visit.price && " · "}
          {visit.price && (
            <span className="font-bold text-foreground">
              {(visit.currency || "EUR")} {visit.price}
            </span>
          )}
        </p>
      )}

      {(positiveTags.length > 0 || negativeTags.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {positiveTags.slice(0, 4).map((tt) => (
            <span
              key={tt.id}
              className="rounded-xl bg-positive/15 px-2.5 py-1 text-xs font-semibold text-positive"
            >
              {tt.tasteTag.name}
            </span>
          ))}
          {negativeTags.slice(0, 2).map((tt) => (
            <span
              key={tt.id}
              className="rounded-xl bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive"
            >
              {tt.tasteTag.name}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
