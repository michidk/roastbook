import type { ComponentProps } from "react"
import { Coffee, Heart, Loader2, Search, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

type NearbyStatus = "idle" | "loading" | "ready" | "error"

type VisitsMapToolbarProps = {
  readonly query: string
  readonly savedCount: number
  readonly visibleDiscoveryCount: number
  readonly isSearching: boolean
  readonly hasSearched: boolean
  readonly searchError: string | null
  readonly nearbyStatus: NearbyStatus
  readonly onQueryChange: (query: string) => void
  readonly onSubmit: ComponentProps<"form">["onSubmit"]
}

export function VisitsMapToolbar({
  query,
  savedCount,
  visibleDiscoveryCount,
  isSearching,
  hasSearched,
  searchError,
  nearbyStatus,
  onQueryChange,
  onSubmit,
}: VisitsMapToolbarProps) {
  return (
    <div className="space-y-4 border-b border-border bg-secondary/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            <h3 className="font-display text-lg font-bold">Explore cafés</h3>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Nearby coffee places appear automatically. Search OpenStreetMap to explore elsewhere.
          </p>
        </div>
        <Badge variant="secondary">{savedCount} saved on map</Badge>
      </div>

      <form onSubmit={onSubmit} role="search">
        <label htmlFor="cafe-map-search" className="sr-only">
          Search for cafés by name, neighborhood, or city
        </label>
        <InputGroup className="h-11! bg-card shadow-coffee">
          <InputGroupInput
            id="cafe-map-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Try “coffee in Kreuzberg” or a café name"
            aria-describedby="cafe-map-search-status"
            className="h-11! text-base"
          />
          <InputGroupAddon align="inline-end" className="p-0 has-[>button]:mr-0">
            <InputGroupButton
              type="submit"
              variant="secondary"
              disabled={query.trim().length < 3 || isSearching}
              aria-label={isSearching ? "Searching for cafés" : "Search for cafés"}
              className="h-11! min-w-11 rounded-none px-3"
            >
              {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
              <span className="hidden sm:inline">{isSearching ? "Searching…" : "Discover"}</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <p id="cafe-map-search-status" className="mt-2 min-h-5 text-xs text-muted-foreground" role="status">
          {getStatusText({
            isSearching,
            searchError,
            hasSearched,
            visibleDiscoveryCount,
            nearbyStatus,
          })}
        </p>
      </form>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted-foreground" aria-label="Map marker legend">
        <span className="flex items-center gap-1.5">
          <span className="relative size-5">
            <span className="flex size-5 -rotate-45 items-center justify-center rounded-[7px_7px_7px_2px] border-2 border-primary bg-ink text-ink-foreground">
              <Coffee className="size-3 rotate-45" aria-hidden />
            </span>
            <Heart className="absolute -top-1.5 -right-1.5 size-3 fill-destructive text-destructive" aria-hidden />
          </span>
          Favorite
        </span>
        <LegendItem variant="saved" label="Saved" />
        <LegendItem variant="discovered" label="Discovered" />
      </div>
    </div>
  )
}

function LegendItem({
  variant,
  label,
}: {
  readonly variant: "saved" | "discovered"
  readonly label: string
}) {
  const colors =
    variant === "saved"
      ? "border-card bg-coffee text-coffee-foreground shadow-coffee"
      : "border-coffee bg-card text-coffee"

  return (
    <span className="flex items-center gap-1.5">
      <span className={`flex size-5 -rotate-45 items-center justify-center rounded-[7px_7px_7px_2px] border-2 ${colors}`}>
        <Coffee className="size-3 rotate-45" aria-hidden />
      </span>
      {label}
    </span>
  )
}

function getStatusText({
  isSearching,
  searchError,
  hasSearched,
  visibleDiscoveryCount,
  nearbyStatus,
}: Pick<
  VisitsMapToolbarProps,
  | "isSearching"
  | "searchError"
  | "hasSearched"
  | "visibleDiscoveryCount"
  | "nearbyStatus"
>): string {
  if (isSearching) return "Searching OpenStreetMap"
  if (searchError) return searchError
  if (hasSearched) {
    return visibleDiscoveryCount === 0
      ? "No informational places remain. Try another café name, neighborhood, or city."
      : `${visibleDiscoveryCount} informational ${visibleDiscoveryCount === 1 ? "place" : "places"} found`
  }
  if (nearbyStatus === "loading") return "Finding cafés near your saved places…"
  if (nearbyStatus === "error") {
    return "Nearby discovery is unavailable. Search to explore cafés elsewhere."
  }
  return visibleDiscoveryCount > 0
    ? `${visibleDiscoveryCount} nearby informational ${visibleDiscoveryCount === 1 ? "place is" : "places are"} shown on the map.`
    : "Search OpenStreetMap to discover cafés beyond your saved places."
}
