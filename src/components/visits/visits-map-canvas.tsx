import { useCallback, useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'

import { MapLibreMap } from '@/components/map/maplibre-map'
import { VisitsMapAttribution } from './visits-map-attribution'
import { VisitsMapControls } from './visits-map-controls'
import { VisitsMapMarkers } from './visits-map-markers'
import { VisitsMapStatus } from './visits-map-status'
import { loadVisitsBasemapStyle } from './visits-map-style'
import type { SavedMapPlace } from './visits-map-utils'

type VisitsMapCanvasProps = {
  readonly places: readonly SavedMapPlace[]
  readonly initialLocation: {
    readonly latitude: number
    readonly longitude: number
  } | null
  readonly selectedPlaceId: string | null
  readonly onSelectPlace: (
    placeId: string | null,
    focusInspector?: boolean,
  ) => void
}

export function VisitsMapCanvas({
  places,
  initialLocation,
  selectedPlaceId,
  onSelectPlace,
}: VisitsMapCanvasProps) {
  const initialPlaceRef = useRef(
    places.find((place) => place.isFavorite) ??
      places.find((place) => place.wantsToVisit) ??
      places[0],
  )
  const retryButtonRef = useRef<HTMLButtonElement | null>(null)
  const shouldFocusRetryRef = useRef(false)
  const [mapAttempt, setMapAttempt] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const firstPlace = initialPlaceRef.current
  const center: readonly [number, number] = initialLocation
    ? [initialLocation.longitude, initialLocation.latitude]
    : firstPlace
      ? [firstPlace.longitude, firstPlace.latitude]
      : [10, 48]

  const handleMapError = useCallback((error: unknown) => {
    console.error('Visits map failed', error)
    shouldFocusRetryRef.current =
      document.activeElement?.closest('.roastbook-map-frame') !== null
    setStatus('error')
  }, [])

  useEffect(() => {
    if (status !== 'error' || !shouldFocusRetryRef.current) return
    shouldFocusRetryRef.current = false
    retryButtonRef.current?.focus()
  }, [status])

  return (
    <MapLibreMap
      attempt={mapAttempt}
      center={center}
      zoom={initialLocation || firstPlace ? 13 : 3}
      loadStyle={loadVisitsBasemapStyle}
      onError={handleMapError}
      onLoad={() => setStatus('ready')}
      onMapClick={() => onSelectPlace(null)}
      ariaLabel="Map of your saved cafés"
      ariaHidden={status !== 'ready'}
      className={
        status === 'error'
          ? 'h-48 w-full overflow-hidden rounded-t-3xl bg-secondary'
          : 'h-[460px] w-full overflow-hidden rounded-t-3xl bg-secondary md:h-[500px] lg:h-[540px]'
      }
    >
      <VisitsMapMarkers
        places={places}
        ready={status === 'ready'}
        selectedPlaceId={selectedPlaceId}
        onSelectPlace={onSelectPlace}
      />
      <VisitsMapControls ready={status === 'ready'} />
      <VisitsMapAttribution fullscreen />
      <VisitsMapStatus
        status={status}
        retryButtonRef={retryButtonRef}
        onRetry={() => {
          setStatus('loading')
          setMapAttempt((attempt) => attempt + 1)
        }}
      />
    </MapLibreMap>
  )
}
