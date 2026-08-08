import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus, MapPin, MapPinOff, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CoffeeShopMap } from "@/components/coffee-shops/coffee-shop-map"
import { EmptyState } from "@/components/EmptyState"
import { getCoffeeShops } from "@/lib/server/coffee-shops"
import { RouteError } from "@/components/route-error"
import { ListPending } from "@/components/route-pending"

export const Route = createFileRoute("/coffee-shops/")({
  loader: () => getCoffeeShops(),
  component: CoffeeShopsPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

function CoffeeShopsPage() {
  const coffeeShops = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Coffee Shops
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Cafes and coffee spots
          </p>
        </div>
        <Button asChild>
          <Link to="/coffee-shops/new">
            <Plus className="h-4 w-4" />
            Add a coffee shop
          </Link>
        </Button>
      </header>

      {coffeeShops.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No coffee shops added yet"
          description="Add your favorite cafes and coffee spots"
          actionLabel="Add a coffee shop"
          actionHref="/coffee-shops/new"
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_24rem] xl:items-start">
          <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <CoffeeShopMap coffeeShops={coffeeShops} heightClassName="h-[360px] md:h-[460px] xl:h-[calc(100vh-14rem)]" />
          </div>

          <Card className="overflow-hidden xl:max-h-[calc(100vh-8rem)]">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Saved coffee shops</CardTitle>
                <Badge variant="outline">{coffeeShops.length}</Badge>
              </div>
            </CardHeader>
            <ScrollArea className="xl:h-[calc(100vh-15rem)]">
              <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-1">
                {coffeeShops.map((coffeeShop) => {
                  const hasCoordinates = coffeeShop.latitude !== null && coffeeShop.longitude !== null

                  return (
                    <Link key={coffeeShop.id} to="/coffee-shops/$coffeeShopId" params={{ coffeeShopId: String(coffeeShop.id) }}>
                      <Card className="h-full cursor-pointer transition-colors hover:bg-muted/50">
                        <CardHeader className="gap-3 pb-2">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <CardTitle className="text-base line-clamp-1">{coffeeShop.name}</CardTitle>
                              {coffeeShop.isFavorite && (
                                <Heart className="h-3.5 w-3.5 shrink-0 fill-current text-destructive" />
                              )}
                            </div>
                            {(coffeeShop.city || coffeeShop.country) && (
                              <p className="text-sm text-muted-foreground">
                                {[coffeeShop.city, coffeeShop.country].filter(Boolean).join(", ")}
                              </p>
                            )}
                            {!hasCoordinates && (
                              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPinOff className="h-3 w-3 shrink-0" />
                                No location set
                              </p>
                            )}
                          </div>
                        </CardHeader>
                        {coffeeShop.address && (
                          <CardContent className="space-y-2 pt-0">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {coffeeShop.address}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    </Link>
                  )
                })}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  )
}
