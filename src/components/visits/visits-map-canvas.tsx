import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl'
import { useCallback, useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  configureVisitsMapMarkerNavigation,
  createVisitsMapMarkerElement,
  getVisibleVisitsMapPlaceIds,
  syncVisitsMapMarkerSelection,
} from './visits-map-marker'
import { VisitsMapStatus } from './visits-map-status'
import { loadVisitsBasemapStyle } from './visits-map-style'
import type { SavedMapPlace } from './visits-map-utils'
import { positionSelectedMapPlace } from './visits-map-viewport'

const MAP_LOAD_TIMEOUT_MS = 8_000

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
  const containerRef = useRef<HTMLElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const initialPlaceRef = useRef(
    places.find((place) => place.isFavorite) ??
      places.find((place) => place.wantsToVisit) ??
      places[0],
  )
  const markersRef = useRef<Map<string, MapLibreMarker>>(new Map())
  const markerElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map())
  const retryButtonRef = useRef<HTMLButtonElement | null>(null)
  const shouldFocusRetryRef = useRef(false)
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const placesRef = useRef(places)
  const selectedPlaceIdRef = useRef(selectedPlaceId)
  const rovingPlaceIdRef = useRef<string | null>(selectedPlaceId)
  const lastSelectedMarkerIdRef = useRef<string | null>(null)
  const lastPositionedPlaceIdRef = useRef<string | null>(null)
  const [mapAttempt, setMapAttempt] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  selectedPlaceIdRef.current = selectedPlaceId
  if (selectedPlaceId && selectedPlaceId !== lastSelectedMarkerIdRef.current) {
    rovingPlaceIdRef.current = selectedPlaceId
  }
  placesRef.current = places
  const handleMapError = useCallback((error: unknown) => {
    console.error('Visits map failed', error)
    const mapHadFocus =
      containerRef.current?.contains(document.activeElement) ?? false
    shouldFocusRetryRef.current = mapHadFocus
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
    loadTimeoutRef.current = null
    setStatus('error')
  }, [])
  const synchronizeMarkerSelection = useCallback((map: MapLibreMap) => {
    let focusedPlaceId: string | null = null
    for (const [placeId, element] of markerElementsRef.current) {
      if (element === document.activeElement) focusedPlaceId = placeId
    }
    const visiblePlaceIds = getVisibleVisitsMapPlaceIds(map, placesRef.current)
    const tabbablePlaceId = syncVisitsMapMarkerSelection(
      markerElementsRef.current,
      selectedPlaceIdRef.current,
      visiblePlaceIds,
      focusedPlaceId ?? rovingPlaceIdRef.current,
    )
    rovingPlaceIdRef.current = tabbablePlaceId
    if (focusedPlaceId && !visiblePlaceIds.includes(focusedPlaceId)) {
      if (tabbablePlaceId)
        markerElementsRef.current.get(tabbablePlaceId)?.focus()
      else map.getCanvas().focus()
    }
  }, [])

  useEffect(() => {
    if (status !== 'error' || !shouldFocusRetryRef.current) return
    shouldFocusRetryRef.current = false
    retryButtonRef.current?.focus()
  }, [status])

  // mapAttempt intentionally re-runs initialization after the user requests a retry.
  // biome-ignore lint/correctness/useExhaustiveDependencies: primitive coordinates keep location dependencies stable
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let disposed = false

    let failed = false

    void (async () => {
      const fail = (error: unknown) => {
        if (disposed || failed) return
        failed = true
        handleMapError(error)
      }
      try {
        const [maplibregl, basemapStyle] = await Promise.all([
          import('maplibre-gl'),
          loadVisitsBasemapStyle(),
        ])
        if (disposed) return
        const firstPlace = initialPlaceRef.current
        const center: [number, number] = initialLocation
          ? [initialLocation.longitude, initialLocation.latitude]
          : firstPlace
            ? [firstPlace.longitude, firstPlace.latitude]
            : [10, 48]
        const map = new maplibregl.Map({
          container,
          style: basemapStyle,
          center,
          zoom: initialLocation || firstPlace ? 13 : 3,
          attributionControl: false,
        })
        mapRef.current = map
        loadTimeoutRef.current = setTimeout(
          () => fail('Map loading timed out'),
          MAP_LOAD_TIMEOUT_MS,
        )
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          'top-right',
        )
        map.on('load', () => {
          if (disposed || failed) return
          if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
          loadTimeoutRef.current = null
          setStatus('ready')
          synchronizeMarkerSelection(map)
        })
        map.on('moveend', () => {
          synchronizeMarkerSelection(map)
        })
        map.on('error', (event) => fail(event.error))
        map.on('click', () => onSelectPlace(null))

        const resizeObserver = new ResizeObserver(() => map.resize())
        resizeObserver.observe(container)
        map.once('remove', () => resizeObserver.disconnect())
      } catch (error) {
        fail(error)
      }
    })()

    return () => {
      disposed = true
      for (const marker of markersRef.current.values()) marker.remove()
      markersRef.current.clear()
      markerElementsRef.current.clear()
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [
    initialLocation?.latitude,
    initialLocation?.longitude,
    mapAttempt,
    handleMapError,
    onSelectPlace,
    synchronizeMarkerSelection,
  ])

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return
    const map = mapRef.current
    let disposed = false

    void (async () => {
      try {
        const maplibregl = await import('maplibre-gl')
        if (disposed) return
        let focusedPlaceId: string | null = null
        for (const [placeId, element] of markerElementsRef.current) {
          if (element === document.activeElement) focusedPlaceId = placeId
        }
        if (focusedPlaceId) rovingPlaceIdRef.current = focusedPlaceId
        for (const marker of markersRef.current.values()) marker.remove()
        markersRef.current.clear()
        markerElementsRef.current.clear()
        for (const place of places) {
          const element = createVisitsMapMarkerElement(place, onSelectPlace)
          const marker = new maplibregl.Marker({ element, anchor: 'center' })
            .setLngLat([place.longitude, place.latitude])
            .addTo(map)
          markersRef.current.set(place.id, marker)
          markerElementsRef.current.set(place.id, element)
        }
        configureVisitsMapMarkerNavigation(
          markerElementsRef.current,
          () => getVisibleVisitsMapPlaceIds(map, placesRef.current),
          (placeId) => {
            rovingPlaceIdRef.current = placeId
          },
        )
        synchronizeMarkerSelection(map)
        if (focusedPlaceId) {
          const focusedMarker = markerElementsRef.current.get(focusedPlaceId)
          if (focusedMarker && !focusedMarker.hidden) focusedMarker.focus()
        }
      } catch (error) {
        if (!disposed) handleMapError(error)
      }
    })()

    return () => {
      disposed = true
    }
  }, [
    handleMapError,
    onSelectPlace,
    places,
    status,
    synchronizeMarkerSelection,
  ])

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return
    const map = mapRef.current
    synchronizeMarkerSelection(map)
    if (!selectedPlaceId) {
      const previousMarkerId = lastSelectedMarkerIdRef.current
      if (previousMarkerId)
        markerElementsRef.current.get(previousMarkerId)?.focus()
      lastSelectedMarkerIdRef.current = null
      lastPositionedPlaceIdRef.current = null
      return
    }
    lastSelectedMarkerIdRef.current = selectedPlaceId
    if (lastPositionedPlaceIdRef.current === selectedPlaceId) return
    const selectedPlace = places.find((place) => place.id === selectedPlaceId)
    if (!selectedPlace) return
    lastPositionedPlaceIdRef.current = selectedPlaceId
    requestAnimationFrame(() => positionSelectedMapPlace(map, selectedPlace))
  }, [places, selectedPlaceId, status, synchronizeMarkerSelection])

  return (
    <div
      className={
        status === 'error'
          ? 'relative h-48 w-full overflow-hidden rounded-t-3xl bg-secondary'
          : 'relative h-[460px] w-full overflow-hidden rounded-t-3xl bg-secondary md:h-[500px] lg:h-[540px]'
      }
    >
      <section
        ref={containerRef}
        className="roastbook-visits-map h-full w-full"
        aria-label="Map of your saved cafés"
        aria-hidden={status !== 'ready'}
        inert={status !== 'ready'}
      />
      <VisitsMapStatus
        status={status}
        retryButtonRef={retryButtonRef}
        onRetry={() => {
          setStatus('loading')
          setMapAttempt((attempt) => attempt + 1)
        }}
      />
    </div>
  )
}
