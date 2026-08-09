import { useCallback, useMemo, useState } from "react"
import { MapPin } from "lucide-react"
import { EmptyState } from "@/components/EmptyState"
import { useSettingsStore } from "@/lib/settings-store"
import { VisitsMapCanvas } from "./visits-map-canvas"
import { VisitsMapPlaceCard } from "./visits-map-place-card"
import {
  toSavedMapPlaces,
  type PlaceVisitInput,
  type SavedPlaceInput,
} from "./visits-map-utils"

type VisitsMapProps = {
  readonly coffeeShops: readonly SavedPlaceInput[]
  readonly visits: readonly PlaceVisitInput[]
}

export function VisitsMap({ coffeeShops, visits }: VisitsMapProps) {
  const defaultMapLocation = useSettingsStore(
    (state) => state.defaultMapLocation,
  )
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [inspectorFocusRequest, setInspectorFocusRequest] = useState(0)
  const savedPlaces = useMemo(
    () => toSavedMapPlaces(coffeeShops, visits),
    [coffeeShops, visits],
  )
  const selectedPlace =
    savedPlaces.find((place) => place.id === selectedPlaceId) ?? null
  const selectPlace = useCallback((placeId: string | null, focusInspector = false) => {
    setSelectedPlaceId(placeId)
    if (focusInspector) {
      setInspectorFocusRequest((request) => request + 1)
    }
  }, [])

  if (savedPlaces.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="No cafés on the map yet"
        description="Add a location to a saved coffee shop to see it here."
        actionLabel="Add a place"
        actionHref="/coffee-shops/new"
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-coffee">
      <div className="relative scroll-mt-16">
        <VisitsMapCanvas
          places={savedPlaces}
          initialLocation={defaultMapLocation}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={selectPlace}
        />
        {selectedPlace && (
          <VisitsMapPlaceCard
            place={selectedPlace}
            focusRequest={inspectorFocusRequest}
            onClose={() => setSelectedPlaceId(null)}
          />
        )}
      </div>
      <p className="border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        Map data ©{" "}
        <a className="underline underline-offset-2 hover:text-foreground" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap contributors
        </a>
        {" · Tiles © "}
        <a className="underline underline-offset-2 hover:text-foreground" href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">
          CARTO
        </a>
        .
      </p>
    </div>
  )
}
