import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from "react"
import { useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { createCoffeeShop } from "@/lib/server/coffee-shops"
import { useSettingsStore } from "@/lib/settings-store"
import {
  discoverCoffeeShopsInBounds,
  searchCoffeeShopCandidates,
} from "@/lib/server/geocoding"
import {
  VisitsMapCanvas,
  type CoffeeShopViewport,
} from "./visits-map-canvas"
import { VisitsMapPlaceCard } from "./visits-map-place-card"
import { VisitsMapToolbar } from "./visits-map-toolbar"
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

const MIN_COFFEE_SHOP_DISCOVERY_ZOOM = 11

export function VisitsMap({ coffeeShops, visits }: VisitsMapProps) {
  const router = useRouter()
  const defaultMapLocation = useSettingsStore(
    (state) => state.defaultMapLocation,
  )
  const [query, setQuery] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [nearbyPlaces, setNearbyPlaces] = useState<DiscoveredMapPlace[]>([])
  const [searchedPlaces, setSearchedPlaces] = useState<DiscoveredMapPlace[]>([])
  const [nearbyStatus, setNearbyStatus] = useState<
    "idle" | "loading" | "ready" | "error" | "zoom-required"
  >("idle")
  const discoveryRequestRef = useRef(0)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [inspectorFocusRequest, setInspectorFocusRequest] = useState(0)
  const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null)
  const [addedPlaceIds, setAddedPlaceIds] = useState<readonly string[]>([])
  const savedPlaces = useMemo(
    () => toSavedMapPlaces(coffeeShops, visits),
    [coffeeShops, visits],
  )
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

  const discoverVisibleCoffeeShops = useCallback(
    async ({ bounds, zoom }: CoffeeShopViewport) => {
      const requestId = discoveryRequestRef.current + 1
      discoveryRequestRef.current = requestId
      if (zoom < MIN_COFFEE_SHOP_DISCOVERY_ZOOM) {
        setNearbyPlaces([])
        setNearbyStatus("zoom-required")
        return
      }
      setNearbyStatus("loading")
      try {
        const candidates = await discoverCoffeeShopsInBounds({ data: bounds })
        if (requestId !== discoveryRequestRef.current) return
        setNearbyPlaces(toDiscoveredMapPlaces(candidates))
        setNearbyStatus("ready")
      } catch (error) {
        if (!(error instanceof Error)) throw error
        if (requestId === discoveryRequestRef.current) {
          setNearbyStatus("error")
        }
      }
    },
    [],
  )

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
      <VisitsMapToolbar
        query={query}
        savedCount={savedPlaces.length}
        visibleDiscoveryCount={visibleDiscoveryCount}
        isSearching={isSearching}
        hasSearched={hasSearched}
        searchError={searchError}
        nearbyStatus={nearbyStatus}
        onQueryChange={setQuery}
        onSubmit={handleSearch}
      />

      <div className="relative">
        <VisitsMapCanvas
          places={places}
          initialLocation={defaultMapLocation}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={selectPlace}
          onViewportChange={discoverVisibleCoffeeShops}
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
