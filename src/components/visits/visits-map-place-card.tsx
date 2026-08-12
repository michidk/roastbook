import { useEffect, useRef } from "react"
import { Link } from "@tanstack/react-router"
import {
  ExternalLink,
  Heart,
  MapPin,
  Plus,
  Star,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { SavedMapPlace } from "./visits-map-utils"

type VisitsMapPlaceCardProps = {
  readonly place: SavedMapPlace
  readonly focusRequest: number
  readonly onClose: () => void
}

export function VisitsMapPlaceCard({
  place,
  focusRequest,
  onClose,
}: VisitsMapPlaceCardProps) {
  const cardRef = useRef<HTMLElement | null>(null)
  const location = [place.city, place.country].filter(Boolean).join(", ")
  const openStreetMapUrl = `https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=18/${place.latitude}/${place.longitude}`

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    if (window.matchMedia("(max-width: 1023px)").matches) {
      card.parentElement?.scrollIntoView({ block: "start" })
    }
    if (focusRequest > 0) card.focus({ preventScroll: true })
  }, [focusRequest])

  return (
    <article
      ref={cardRef}
      id="visits-map-place-inspector"
      tabIndex={-1}
      aria-labelledby="visits-map-place-title"
      className="roastbook-visits-map-inspector relative z-20 m-3 rounded-3xl border border-border/80 bg-card/95 p-4 shadow-coffee-strong backdrop-blur-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:absolute lg:bottom-4 lg:left-4 lg:m-0 lg:w-[22rem]"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-coffee">
          {place.isFavorite ? (
            <Heart className="size-4 fill-current text-destructive" aria-hidden />
          ) : (
            <MapPin className="size-4" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="visits-map-place-title" className="font-display text-lg leading-tight font-bold text-foreground">
              {place.name}
            </h3>
            <Badge variant={place.isFavorite ? "destructive" : "secondary"}>
              {place.isFavorite ? "Favorite" : "Saved"}
            </Badge>
          </div>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            {place.address || location || "Location details available on the map"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close place details"
          className="-mt-1 -mr-1 min-h-11 min-w-11"
        >
          <X />
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
        <span className="rounded-xl bg-secondary px-2.5 py-1 font-semibold">
          {place.visitCount} {place.visitCount === 1 ? "visit" : "visits"}
        </span>
        {place.rating !== null && (
          <span className="flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 font-semibold text-foreground">
            <Star className="size-3.5 fill-primary text-primary" />
            {place.rating}/5
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" className="min-h-11">
          <Link
            to="/coffee-shops/$coffeeShopId"
            params={{ coffeeShopId: String(place.coffeeShopId) }}
          >
            View place
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="min-h-11">
          <Link
            to="/visits/new"
            search={{ coffeeShopId: String(place.coffeeShopId) }}
          >
            <Plus />
            Log visit
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="min-h-11">
          <a href={openStreetMapUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
            Map details
          </a>
        </Button>
      </div>
    </article>
  )
}
