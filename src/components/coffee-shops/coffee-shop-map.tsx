import { MapPin } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { VisitsMapCanvas } from '@/components/visits/visits-map-canvas'
import { VisitsMapPlaceCard } from '@/components/visits/visits-map-place-card'
import {
  type PlaceVisitInput,
  type SavedPlaceInput,
  toSavedMapPlaces,
} from '@/components/visits/visits-map-utils'
import { useAppSettings } from '@/hooks/use-app-settings'

type CoffeeShopMapProps = {
  readonly coffeeShops: readonly SavedPlaceInput[]
  readonly visits?: readonly PlaceVisitInput[]
  readonly focusFirstCoffeeShop?: boolean
}

export function CoffeeShopMap({
  coffeeShops,
  visits = [],
  focusFirstCoffeeShop = false,
}: CoffeeShopMapProps) {
  const { defaultMapLocation } = useAppSettings()
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [inspectorFocusRequest, setInspectorFocusRequest] = useState(0)
  const savedPlaces = useMemo(
    () => toSavedMapPlaces(coffeeShops, visits),
    [coffeeShops, visits],
  )
  const selectedPlace =
    savedPlaces.find((place) => place.id === selectedPlaceId) ?? null
  const selectPlace = useCallback(
    (placeId: string | null, focusInspector = false) => {
      setSelectedPlaceId(placeId)
      if (focusInspector) {
        setInspectorFocusRequest((request) => request + 1)
      }
    },
    [],
  )

  if (savedPlaces.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="No cafés on the map yet"
        description="Add a location to a saved café to see it here."
        actionLabel="Add a café"
        actionHref="/places/new"
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-coffee">
      <div className="relative scroll-mt-16">
        <VisitsMapCanvas
          places={savedPlaces}
          initialLocation={focusFirstCoffeeShop ? null : defaultMapLocation}
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
        ©{' '}
        <a
          className="underline underline-offset-2 hover:text-foreground"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenStreetMap contributors
        </a>
        {' · '}
        <a
          className="underline underline-offset-2 hover:text-foreground"
          href="https://openfreemap.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenFreeMap
        </a>
        {' · © '}
        <a
          className="underline underline-offset-2 hover:text-foreground"
          href="https://openmaptiles.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenMapTiles
        </a>
        .
      </p>
    </div>
  )
}
