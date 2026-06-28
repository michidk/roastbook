import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PlaceMap } from "@/components/places/place-map"
import { EmptyState } from "@/components/EmptyState"
import { getPlaces } from "@/lib/server/places"
import { RouteError } from "@/components/route-error"
import { ListPending } from "@/components/route-pending"

export const Route = createFileRoute("/places/")({
  loader: () => getPlaces(),
  component: PlacesPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

function PlacesPage() {
  const places = Route.useLoaderData()
  const mappedPlaces = places.filter(
    (place) => place.latitude !== null && place.longitude !== null,
  )
  const mappedPlacesCount = mappedPlaces.length

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Places
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Cafes and coffee spots
          </p>
        </div>
        <Button asChild>
          <Link to="/places/new">
            <Plus className="h-4 w-4" />
            Add a place
          </Link>
        </Button>
      </header>

      {places.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No places added yet"
          description="Add your favorite cafes and coffee spots"
          actionLabel="Add a place"
          actionHref="/places/new"
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_24rem] xl:items-start">
          <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <PlaceMap places={places} heightClassName="h-[360px] md:h-[460px] xl:h-[calc(100vh-14rem)]" />
          </div>

          <Card className="overflow-hidden xl:max-h-[calc(100vh-8rem)]">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Saved places</CardTitle>
                <Badge variant="outline">{mappedPlacesCount}</Badge>
              </div>
            </CardHeader>
            <ScrollArea className="xl:h-[calc(100vh-15rem)]">
              <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-1">
                {mappedPlaces.map((place) => (
                  <Link key={place.id} to="/places/$placeId" params={{ placeId: String(place.id) }}>
                    <Card className="h-full cursor-pointer transition-colors hover:bg-muted/50">
                      <CardHeader className="gap-3 pb-2">
                        <div className="min-w-0 space-y-1">
                          <CardTitle className="text-base line-clamp-1">{place.name}</CardTitle>
                          {(place.city || place.country) && (
                            <p className="text-sm text-muted-foreground">
                              {[place.city, place.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </CardHeader>
                      {place.address && (
                        <CardContent className="space-y-2 pt-0">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {place.address}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  </Link>
                ))}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  )
}
