import type { GeoJSONSource, Marker as MapLibreMarker } from 'maplibre-gl'
import { useCallback, useEffect, useRef } from 'react'

import { useMapLibreMap } from '@/components/map/maplibre-map'
import { createVisitsMapFeatureCollection } from './visits-map-cluster-data'
import {
  configureVisitsMapMarkerNavigation,
  createVisitsMapMarkerElement,
  syncVisitsMapMarkerSelection,
} from './visits-map-marker'
import type { SavedMapPlace } from './visits-map-utils'
import { positionSelectedMapPlace } from './visits-map-viewport'

const SOURCE_ID = 'roastbook-saved-cafes'
const CLUSTER_LAYER_ID = 'roastbook-saved-cafe-clusters'
const POINT_LAYER_ID = 'roastbook-saved-cafe-points'

type VisitsMapMarkersProps = {
  readonly places: readonly SavedMapPlace[]
  readonly ready: boolean
  readonly selectedPlaceId: string | null
  readonly onSelectPlace: (
    placeId: string | null,
    focusInspector?: boolean,
  ) => void
}

function addVisitsClusterSource(
  map: import('maplibre-gl').Map,
  places: readonly SavedMapPlace[],
) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: createVisitsMapFeatureCollection(places),
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 48,
    })
  }
  if (!map.getLayer(CLUSTER_LAYER_ID)) {
    map.addLayer({
      id: CLUSTER_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': 'rgba(0, 0, 0, 0)',
        'circle-opacity': 0,
        'circle-radius': 24,
      },
    })
  }
  if (!map.getLayer(POINT_LAYER_ID)) {
    map.addLayer({
      id: POINT_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': 'rgba(0, 0, 0, 0)',
        'circle-opacity': 0,
        'circle-radius': 10,
      },
    })
  }
}

function createClusterElement(
  count: number,
  onExpand: () => void,
): HTMLButtonElement {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = 'roastbook-visits-map-cluster'
  element.setAttribute(
    'aria-label',
    `Zoom in to view ${count} ${count === 1 ? 'café' : 'cafés'}`,
  )
  element.textContent = String(count)
  element.addEventListener('click', (event) => {
    event.stopPropagation()
    onExpand()
  })
  return element
}

export function VisitsMapMarkers({
  places,
  ready,
  selectedPlaceId,
  onSelectPlace,
}: VisitsMapMarkersProps) {
  const { map, maplibre } = useMapLibreMap()
  const markersRef = useRef<Map<string, MapLibreMarker>>(new Map())
  const clusterMarkersRef = useRef<Map<number, MapLibreMarker>>(new Map())
  const markerElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map())
  const displayedPlaceIdsRef = useRef<readonly string[]>([])
  const placesRef = useRef(places)
  const selectedPlaceIdRef = useRef(selectedPlaceId)
  const rovingPlaceIdRef = useRef<string | null>(selectedPlaceId)
  const lastSelectedMarkerIdRef = useRef<string | null>(null)
  const lastPositionedPlaceIdRef = useRef<string | null>(null)
  placesRef.current = places
  selectedPlaceIdRef.current = selectedPlaceId
  if (selectedPlaceId && selectedPlaceId !== lastSelectedMarkerIdRef.current) {
    rovingPlaceIdRef.current = selectedPlaceId
  }

  const synchronizeMarkerSelection = useCallback(() => {
    if (!map) return
    let focusedPlaceId: string | null = null
    for (const [placeId, element] of markerElementsRef.current) {
      if (element === document.activeElement) focusedPlaceId = placeId
    }
    const tabbablePlaceId = syncVisitsMapMarkerSelection(
      markerElementsRef.current,
      selectedPlaceIdRef.current,
      displayedPlaceIdsRef.current,
      focusedPlaceId ?? rovingPlaceIdRef.current,
    )
    rovingPlaceIdRef.current = tabbablePlaceId
    if (
      focusedPlaceId &&
      !displayedPlaceIdsRef.current.includes(focusedPlaceId)
    ) {
      if (tabbablePlaceId)
        markerElementsRef.current.get(tabbablePlaceId)?.focus()
      else map.getCanvas().focus()
    }
  }, [map])

  const synchronizeClusters = useCallback(() => {
    if (
      !map ||
      !maplibre ||
      !ready ||
      !map.getLayer(CLUSTER_LAYER_ID) ||
      !map.getLayer(POINT_LAYER_ID)
    )
      return

    const visiblePointIds = new Set<string>()
    for (const feature of map.queryRenderedFeatures({
      layers: [POINT_LAYER_ID],
    })) {
      const placeId = feature.properties.placeId
      if (typeof placeId === 'string') visiblePointIds.add(placeId)
    }
    displayedPlaceIdsRef.current = placesRef.current
      .map((place) => place.id)
      .filter((placeId) => visiblePointIds.has(placeId))

    const seenClusterIds = new Set<number>()
    for (const feature of map.queryRenderedFeatures({
      layers: [CLUSTER_LAYER_ID],
    })) {
      if (feature.geometry.type !== 'Point') continue
      const clusterId = feature.properties.cluster_id
      const count = feature.properties.point_count
      if (
        typeof clusterId !== 'number' ||
        typeof count !== 'number' ||
        seenClusterIds.has(clusterId)
      )
        continue
      seenClusterIds.add(clusterId)
      const [longitude, latitude] = feature.geometry.coordinates
      if (typeof longitude !== 'number' || typeof latitude !== 'number')
        continue
      const existingMarker = clusterMarkersRef.current.get(clusterId)
      if (existingMarker) {
        const position = existingMarker.getLngLat()
        if (position.lng !== longitude || position.lat !== latitude) {
          existingMarker.setLngLat([longitude, latitude])
        }
        continue
      }
      const element = createClusterElement(count, () => {
        const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined
        if (!source) return
        void source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({
            center: [longitude, latitude],
            zoom,
            duration: window.matchMedia('(prefers-reduced-motion: reduce)')
              .matches
              ? 0
              : 400,
          })
        })
      })
      const marker = new maplibre.Marker({ element, anchor: 'center' })
        .setLngLat([longitude, latitude])
        .addTo(map)
      clusterMarkersRef.current.set(clusterId, marker)
    }
    for (const [clusterId, marker] of clusterMarkersRef.current) {
      if (seenClusterIds.has(clusterId)) continue
      marker.remove()
      clusterMarkersRef.current.delete(clusterId)
    }
    synchronizeMarkerSelection()
  }, [map, maplibre, ready, synchronizeMarkerSelection])

  useEffect(() => {
    if (!map) return
    const installSource = () => {
      addVisitsClusterSource(map, placesRef.current)
    }
    map.on('load', installSource)
    map.on('style.load', installSource)
    if (map.isStyleLoaded()) installSource()
    return () => {
      map.off('load', installSource)
      map.off('style.load', installSource)
    }
  }, [map])

  useEffect(() => {
    if (!map || !maplibre) return
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
      element.hidden = true
      const marker = new maplibre.Marker({ element, anchor: 'center' })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map)
      markersRef.current.set(place.id, marker)
      markerElementsRef.current.set(place.id, element)
    }
    configureVisitsMapMarkerNavigation(
      markerElementsRef.current,
      () => displayedPlaceIdsRef.current,
      (placeId) => {
        rovingPlaceIdRef.current = placeId
      },
    )
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined
    source?.setData(createVisitsMapFeatureCollection(places))
    synchronizeClusters()
    if (focusedPlaceId) {
      const focusedMarker = markerElementsRef.current.get(focusedPlaceId)
      if (focusedMarker && !focusedMarker.hidden) focusedMarker.focus()
    }

    return () => {
      for (const marker of markersRef.current.values()) marker.remove()
      markersRef.current.clear()
      markerElementsRef.current.clear()
    }
  }, [map, maplibre, onSelectPlace, places, synchronizeClusters])

  useEffect(() => {
    if (!map) return
    map.on('idle', synchronizeClusters)
    map.on('moveend', synchronizeClusters)
    return () => {
      map.off('idle', synchronizeClusters)
      map.off('moveend', synchronizeClusters)
      for (const marker of clusterMarkersRef.current.values()) marker.remove()
      clusterMarkersRef.current.clear()
    }
  }, [map, synchronizeClusters])

  useEffect(() => {
    if (!map || !ready) return
    synchronizeMarkerSelection()
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
  }, [map, places, ready, selectedPlaceId, synchronizeMarkerSelection])

  return null
}
