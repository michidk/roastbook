import { createFileRoute, Link } from "@tanstack/react-router"
import { MapPin, Plus } from "lucide-react"
import { CoffeeShopCard } from "@/components/coffee-shops/coffee-shop-card"
import { EmptyState } from "@/components/EmptyState"
import { RouteError } from "@/components/route-error"
import { ListPending } from "@/components/route-pending"
import { Button } from "@/components/ui/button"
import { sortCoffeeShopsByFavoriteAndLastVisit } from "@/lib/coffee-shop-ranking"
import { getCafeVisits } from "@/lib/server/cafe-visits"
import { getCoffeeShops } from "@/lib/server/coffee-shops"

export const Route = createFileRoute("/places/")({
  loader: async () => {
    const [coffeeShops, visits] = await Promise.all([
      getCoffeeShops(),
      getCafeVisits(),
    ])
    return sortCoffeeShopsByFavoriteAndLastVisit(coffeeShops, visits)
  },
  component: PlacesPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

function PlacesPage() {
  const coffeeShops = Route.useLoaderData()

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Places
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Manage {coffeeShops.length} saved {coffeeShops.length === 1 ? "café" : "cafés"}
          </p>
        </div>
        <Button asChild>
          <Link to="/coffee-shops/new">
            <Plus aria-hidden className="h-4 w-4" />
            Add a place
          </Link>
        </Button>
      </header>

      {coffeeShops.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No places added yet"
          description="Add your favorite cafés and coffee spots"
          actionLabel="Add a place"
          actionHref="/coffee-shops/new"
        />
      ) : (
        <div className="@container">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coffeeShops.map((coffeeShop) => (
              <CoffeeShopCard key={coffeeShop.id} coffeeShop={coffeeShop} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
