import { getOpenStreetMapUrl, type MapStatus, type MappableCoffeeShop } from "./coffee-shop-map-utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function CoffeeShopMapStatus({
  coffeeShops,
  status,
  onRetry,
}: {
  readonly coffeeShops: readonly MappableCoffeeShop[]
  readonly status: MapStatus
  readonly onRetry: () => void
}) {
  if (status === "ready") return null
  const coffeeShop = coffeeShops[0]

  if (status === "loading") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading map"
        className="absolute inset-0 z-10 overflow-hidden"
      >
        <Skeleton className="h-full w-full rounded-none" />
      </div>
    )
  }

  return (
    <div
      role="alert"
      className="absolute inset-0 z-10 flex items-center justify-center bg-secondary/95 px-6 text-center"
    >
      <div className="space-y-2">
        <p className="font-display font-bold">Map unavailable</p>
        {coffeeShop && (
          <>
            <p className="text-sm text-muted-foreground">
              {coffeeShop.name}: {coffeeShop.latitude.toFixed(4)}, {coffeeShop.longitude.toFixed(4)}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" variant="outline" onClick={onRetry}>
                Retry map
              </Button>
              <Button asChild>
                <a
                  href={getOpenStreetMapUrl(coffeeShop)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in OpenStreetMap
                </a>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
