import type { Map as MapLibreMap } from 'maplibre-gl'
import { getMapMarkerVariant, type SavedMapPlace } from './visits-map-utils'

export function getVisibleVisitsMapPlaceIds(
  map: MapLibreMap,
  places: readonly SavedMapPlace[],
): readonly string[] {
  const bounds = map.getBounds()
  return places
    .filter((place) => bounds.contains([place.longitude, place.latitude]))
    .map((place) => place.id)
}

export function createVisitsMapMarkerElement(
  place: SavedMapPlace,
  onSelect: (placeId: string, focusInspector: boolean) => void,
): HTMLButtonElement {
  const variant = getMapMarkerVariant(place)
  const marker = document.createElement('button')
  marker.type = 'button'
  marker.className = 'roastbook-visits-map-marker'
  marker.tabIndex = -1
  marker.dataset.variant = variant
  marker.dataset.selected = 'false'
  marker.setAttribute('aria-pressed', 'false')
  const location = place.address ?? place.city
  marker.setAttribute(
    'aria-label',
    `${variant === 'favorite' ? 'Favorite café' : place.wantsToVisit ? 'Want-to-visit café' : 'Saved café'}: ${place.name}${location ? `, ${location}` : ''}`,
  )

  const pin = document.createElement('span')
  pin.className = 'roastbook-visits-map-marker-pin'
  pin.setAttribute('aria-hidden', 'true')
  marker.append(pin)

  marker.addEventListener('click', (event) => {
    event.stopPropagation()
    onSelect(place.id, event.detail === 0)
  })
  return marker
}

export function configureVisitsMapMarkerNavigation(
  markerElements: ReadonlyMap<string, HTMLButtonElement>,
  getNavigablePlaceIds: () => readonly string[],
  onRovingPlaceChange: (placeId: string) => void,
): void {
  for (const marker of markerElements.values()) {
    marker.addEventListener('keydown', (event) => {
      const direction =
        event.key === 'ArrowRight' || event.key === 'ArrowDown'
          ? 1
          : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
            ? -1
            : 0
      if (direction === 0) return
      event.preventDefault()
      event.stopPropagation()
      const entries: [string, HTMLButtonElement][] = []
      for (const placeId of getNavigablePlaceIds()) {
        const element = markerElements.get(placeId)
        if (element) entries.push([placeId, element])
      }
      const index = entries.findIndex(([, element]) => element === marker)
      if (index < 0 || entries.length === 0) return
      const nextIndex = (index + direction + entries.length) % entries.length
      const nextEntry = entries[nextIndex]
      if (!nextEntry) return
      for (const [, element] of entries) element.tabIndex = -1
      const [nextPlaceId, nextMarker] = nextEntry
      nextMarker.tabIndex = 0
      nextMarker.focus()
      onRovingPlaceChange(nextPlaceId)
    })
  }
}

export function syncVisitsMapMarkerSelection(
  markerElements: ReadonlyMap<string, HTMLButtonElement>,
  selectedPlaceId: string | null,
  displayedPlaceIds: readonly string[],
  preferredTabbablePlaceId: string | null,
): string | null {
  const displayedPlaceIdSet = new Set(displayedPlaceIds)
  const preferredMarker = preferredTabbablePlaceId
    ? displayedPlaceIdSet.has(preferredTabbablePlaceId)
      ? markerElements.get(preferredTabbablePlaceId)
      : undefined
    : undefined
  const selectedMarker = selectedPlaceId
    ? displayedPlaceIdSet.has(selectedPlaceId)
      ? markerElements.get(selectedPlaceId)
      : undefined
    : undefined
  const firstDisplayedPlaceId = displayedPlaceIds[0]
  const tabbableMarker =
    preferredMarker ??
    selectedMarker ??
    (firstDisplayedPlaceId
      ? markerElements.get(firstDisplayedPlaceId)
      : undefined)
  for (const [placeId, marker] of markerElements) {
    const isSelected = placeId === selectedPlaceId
    marker.hidden = !displayedPlaceIdSet.has(placeId)
    marker.dataset.selected = String(isSelected)
    marker.setAttribute('aria-pressed', String(isSelected))
    marker.tabIndex = marker === tabbableMarker ? 0 : -1
    if (isSelected) {
      marker.setAttribute('aria-controls', 'visits-map-place-inspector')
    } else {
      marker.removeAttribute('aria-controls')
    }
  }
  return (
    displayedPlaceIds.find(
      (placeId) => markerElements.get(placeId) === tabbableMarker,
    ) ?? null
  )
}
