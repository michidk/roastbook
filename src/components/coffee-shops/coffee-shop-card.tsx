import { Link } from "@tanstack/react-router"
import { ChevronRight, Heart, MapPin, MapPinOff } from "lucide-react"

export type CoffeeShopCardItem = {
  readonly id: number
  readonly name: string
  readonly city: string | null
  readonly country: string | null
  readonly latitude: string | null
  readonly longitude: string | null
  readonly isFavorite: boolean
}

export function CoffeeShopCard({
  coffeeShop,
}: {
  readonly coffeeShop: CoffeeShopCardItem
}) {
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
        <LocationIcon aria-hidden className="size-4" />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-display text-base font-bold text-foreground">
            {coffeeShop.name}
          </span>
          {coffeeShop.isFavorite && (
            <Heart
              aria-label="Favorite"
              className="size-3.5 shrink-0 fill-current text-destructive"
            />
          )}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {location || (hasCoordinates ? "Location pinned" : "No location set")}
        </span>
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1"
      />
    </Link>
  )
}
