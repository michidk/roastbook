import { Link } from '@tanstack/react-router'
import { Bookmark, ChevronRight, Heart } from 'lucide-react'
import { interactiveCardLinkClassName } from '@/components/ui/card'
import { WebsiteLogo } from '@/components/website-logo'
import { cn } from '@/lib/utils'

type CoffeeShopCardItem = {
  readonly id: number
  readonly name: string
  readonly address: string | null
  readonly city: string | null
  readonly country: string | null
  readonly website: string | null
  readonly updatedAt: Date | string
  readonly latitude: string | null
  readonly longitude: string | null
  readonly isFavorite: boolean
  readonly wantsToVisit: boolean
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
  const location = [coffeeShop.address, coffeeShop.city, coffeeShop.country]
    .filter(Boolean)
    .join(', ')

  return (
    <Link
      to="/places/$coffeeShopId"
      params={{ coffeeShopId: String(coffeeShop.id) }}
      className={cn(
        interactiveCardLinkClassName,
        'flex items-center gap-3 bg-card p-4 shadow-coffee',
        isProminentFavorite && 'ring-2 ring-favorite/35 ring-inset',
      )}
    >
      <WebsiteLogo
        entityType="coffee-shops"
        entityId={coffeeShop.id}
        website={coffeeShop.website}
        updatedAt={coffeeShop.updatedAt}
        className="size-10 rounded-full p-1"
      />
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
          {coffeeShop.wantsToVisit && (
            <Bookmark
              aria-label="Want to visit"
              className="size-3.5 shrink-0 fill-current text-primary"
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
