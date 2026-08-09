import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type SyntheticEvent,
} from "react"
import { useRouter } from "@tanstack/react-router"
import { Coffee, Heart, Loader2, Search, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { createCoffeeShop } from "@/lib/server/coffee-shops"
import {
  discoverNearbyCoffeeShops,
  searchCoffeeShopCandidates,
} from "@/lib/server/geocoding"
import { VisitsMapCanvas } from "./visits-map-canvas"
import { VisitsMapPlaceCard } from "./visits-map-place-card"
import {
  getVisibleMapPlaces,
  toDiscoveredMapPlaces,
  toSavedMapPlaces,
  type DiscoveredMapPlace,
  type PlaceVisitInput,
  type SavedPlaceInput,
  type VisitsMapPlace,
} from "./visits-map-utils"

type VisitsMapProps = {
  readonly coffeeShops: readonly SavedPlaceInput[]
  readonly visits: readonly PlaceVisitInput[]
}

export function VisitsMap({ coffeeShops, visits }: VisitsMapProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [nearbyPlaces, setNearbyPlaces] = useState<DiscoveredMapPlace[]>([])
  const [searchedPlaces, setSearchedPlaces] = useState<DiscoveredMapPlace[]>([])
  const [nearbyStatus, setNearbyStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle")
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [inspectorFocusRequest, setInspectorFocusRequest] = useState(0)
  const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null)
  const [addedPlaceIds, setAddedPlaceIds] = useState<readonly string[]>([])
  const savedPlaces = useMemo(
    () => toSavedMapPlaces(coffeeShops, visits),
    [coffeeShops, visits],
  )
  const discoveryCenter =
    savedPlaces.find((place) => place.isFavorite) ?? savedPlaces[0] ?? null
  const discoveredPlaces = useMemo(() => {
    const placesById = new Map<string, DiscoveredMapPlace>()
    for (const place of [...nearbyPlaces, ...searchedPlaces]) {
      placesById.set(place.id, place)
    }
    return [...placesById.values()]
  }, [nearbyPlaces, searchedPlaces])
  const places = useMemo(
    () => getVisibleMapPlaces(savedPlaces, discoveredPlaces),
    [discoveredPlaces, savedPlaces],
  )
  const visibleDiscoveryCount = places.filter(
    (place) => place.kind === "discovered",
  ).length
  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? null
  const selectPlace = useCallback((placeId: string | null, focusInspector = false) => {
    setSelectedPlaceId(placeId)
    if (focusInspector) {
      setInspectorFocusRequest((request) => request + 1)
    }
  }, [])

  useEffect(() => {
    if (!discoveryCenter) return
    let disposed = false
    setNearbyStatus("loading")

    void discoverNearbyCoffeeShops({
      data: {
        latitude: discoveryCenter.latitude,
        longitude: discoveryCenter.longitude,
      },
    })
      .then((candidates) => {
        if (disposed) return
        setNearbyPlaces(toDiscoveredMapPlaces(candidates))
        setNearbyStatus("ready")
      })
      .catch((error) => {
        if (!(error instanceof Error)) throw error
        if (!disposed) setNearbyStatus("error")
      })

    return () => {
      disposed = true
    }
  }, [discoveryCenter?.latitude, discoveryCenter?.longitude])

  const handleSearch = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedQuery = query.trim().replace(/\s+/g, " ")
    if (normalizedQuery.length < 3 || isSearching) return
    setIsSearching(true)
    setHasSearched(true)
    setSearchError(null)

    try {
      const results = await searchCoffeeShopCandidates({
        data: { query: normalizedQuery, limit: 5 },
      })
      const discoveries = toDiscoveredMapPlaces(results)
      const firstVisibleDiscovery = getVisibleMapPlaces(
        savedPlaces,
        discoveries,
      ).find((place) => place.kind === "discovered")
      setSearchedPlaces(discoveries)
      setSelectedPlaceId(firstVisibleDiscovery?.id ?? null)
    } catch (error) {
      if (!(error instanceof Error)) throw error
      setSearchError("OpenStreetMap search is unavailable right now")
      toast.error("Could not search for cafés right now")
    } finally {
      setIsSearching(false)
    }
  }

  const addDiscoveredPlace = async (place: VisitsMapPlace) => {
    if (place.kind !== "discovered" || addingPlaceId !== null) return
    setAddingPlaceId(place.id)
    try {
      const savedCoffeeShop = await createCoffeeShop({
        data: {
          name: place.name,
          address: place.address ?? undefined,
          city: place.city ?? undefined,
          country: place.country ?? undefined,
          latitude: place.latitude,
          longitude: place.longitude,
          website: place.website ?? undefined,
        },
      })
      setAddedPlaceIds((current) => [...current, place.id])
      toast.success(`${place.name} added to Roastbook`)
      await router.invalidate()
      if (savedCoffeeShop) {
        setSelectedPlaceId(`saved:${savedCoffeeShop.id}`)
      }
    } catch (error) {
      if (!(error instanceof Error)) throw error
      toast.error("Could not add this café")
    } finally {
      setAddingPlaceId(null)
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-coffee">
      <div className="space-y-4 border-b border-border bg-secondary/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" aria-hidden />
              <h3 className="font-display text-lg font-bold">Explore cafés</h3>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Search OpenStreetMap to preview coffee places alongside your Roastbook map.
            </p>
          </div>
          <Badge variant="secondary">{savedPlaces.length} saved on map</Badge>
        </div>

        <form onSubmit={handleSearch} role="search">
          <label htmlFor="cafe-map-search" className="sr-only">
            Search for cafés by name, neighborhood, or city
          </label>
          <InputGroup className="h-11! bg-card shadow-coffee">
            <InputGroupInput
              id="cafe-map-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
            {isSearching
              ? "Searching OpenStreetMap"
              : searchError ?? (hasSearched
                ? visibleDiscoveryCount === 0
                  ? "No informational places remain. Try another café name, neighborhood, or city."
                  : `${visibleDiscoveryCount} informational ${visibleDiscoveryCount === 1 ? "place" : "places"} found`
                : nearbyStatus === "loading"
                  ? "Finding cafés near your saved places…"
                  : nearbyStatus === "error"
                    ? "Nearby discovery is unavailable. Search to explore cafés elsewhere."
                    : visibleDiscoveryCount > 0
                      ? `${visibleDiscoveryCount} nearby informational ${visibleDiscoveryCount === 1 ? "place is" : "places are"} shown on the map.`
                      : "Search OpenStreetMap to discover cafés beyond your saved places.")}
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
          <span className="flex items-center gap-1.5">
            <span className="flex size-5 -rotate-45 items-center justify-center rounded-[7px_7px_7px_2px] border-2 border-card bg-coffee text-coffee-foreground shadow-coffee">
              <Coffee className="size-3 rotate-45" aria-hidden />
            </span>
            Saved
          </span>
          <span className="flex items-center gap-1.5">
            <span className="flex size-5 -rotate-45 items-center justify-center rounded-[7px_7px_7px_2px] border-2 border-coffee bg-card text-coffee">
              <Coffee className="size-3 rotate-45" aria-hidden />
            </span>
            Discovered
          </span>
        </div>
      </div>

      <div className="relative">
        <VisitsMapCanvas
          places={places}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={selectPlace}
        />
        {selectedPlace && (
          <VisitsMapPlaceCard
            place={selectedPlace}
            isAdding={addingPlaceId === selectedPlace.id}
            wasAdded={addedPlaceIds.includes(selectedPlace.id)}
            focusRequest={inspectorFocusRequest}
            onAdd={addDiscoveredPlace}
            onClose={() => setSelectedPlaceId(null)}
          />
        )}
      </div>
      <p className="border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        Search results and map data ©{" "}
        <a className="underline underline-offset-2 hover:text-foreground" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap contributors
        </a>{" "}
        via{" "}
        <a className="underline underline-offset-2 hover:text-foreground" href="https://nominatim.org/" target="_blank" rel="noopener noreferrer">
          Nominatim
        </a>.
      </p>
    </div>
  )
}
