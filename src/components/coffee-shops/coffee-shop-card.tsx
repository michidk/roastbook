import { Link } from '@tanstack/react-router'
import { ChevronRight, Heart, MapPin, MapPinOff } from 'lucide-react'
import { interactiveCardLinkClassName } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type CoffeeShopCardItem = {
  readonly id: number
  readonly name: string
  readonly address: string | null
  readonly city: string | null
  readonly country: string | null
  readonly latitude: string | null
  readonly longitude: string | null
  readonly isFavorite: boolean
}

type CoffeeShopCardProps = {
  readonly coffeeShop: CoffeeShopCardItem
  readonly emphasizeFavorite?: boolean
}

export function CoffeeShopCard({
  coffeeShop,
  emphasizeFavorite = false,
}: CoffeeShopCardProps) {
  const hasCoordinates =
    coffeeShop.latitude !== null && coffeeShop.longitude !== null
  const isProminentFavorite = emphasizeFavorite && coffeeShop.isFavorite
  const LocationIcon = isProminentFavorite
    ? Heart
    : hasCoordinates
      ? MapPin
      : MapPinOff
  const location = [coffeeShop.address, coffeeShop.city, coffeeShop.country]
    .filter(Boolean)
    .join(', ')

  return (
    <Link
      to="/shops/$coffeeShopId"
      params={{ coffeeShopId: String(coffeeShop.id) }}
      className={cn(
        interactiveCardLinkClassName,
        'flex items-center gap-3 bg-card p-4 shadow-coffee',
        isProminentFavorite && 'ring-2 ring-favorite/35 ring-inset',
      )}
    >
      <span
        className={
          isProminentFavorite
            ? 'flex size-10 shrink-0 items-center justify-center rounded-full bg-favorite/15 text-favorite'
            : hasCoordinates
              ? 'flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'
              : 'flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground'
        }
      >
        <LocationIcon
          aria-hidden
          className={cn('size-4', isProminentFavorite && 'fill-current')}
        />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="flex items-center gap-1.5">
          {isProminentFavorite && (
            <span className="sr-only">Favorite café: </span>
          )}
          <span className="truncate font-display text-base font-bold text-foreground">
            {coffeeShop.name}
          </span>
          {coffeeShop.isFavorite && !isProminentFavorite && (
            <Heart
              aria-label="Favorite"
              className="size-3.5 shrink-0 fill-current text-favorite"
            />
          )}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {location || (hasCoordinates ? 'Location pinned' : 'No location set')}
        </span>
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1"
      />
    </Link>
  )
}
