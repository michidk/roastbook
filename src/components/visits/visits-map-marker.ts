import type { Map as MapLibreMap } from "maplibre-gl"
import { getMapMarkerVariant, type SavedMapPlace } from "./visits-map-utils"

const SVG_NAMESPACE = "http://www.w3.org/2000/svg"

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
  const marker = document.createElement("button")
  marker.type = "button"
  marker.className = "roastbook-visits-map-marker"
  marker.tabIndex = -1
  marker.dataset.variant = variant
  marker.dataset.selected = "false"
  marker.setAttribute("aria-pressed", "false")
  const location = place.address ?? place.city
  marker.setAttribute(
    "aria-label",
    `${variant === "favorite" ? "Favorite café" : "Saved café"}: ${place.name}${location ? `, ${location}` : ""}`,
  )

  const pin = document.createElement("span")
  pin.className = "roastbook-visits-map-marker-pin"
  pin.append(createCoffeeCupIcon())
  marker.append(pin)

  if (variant === "favorite") {
    const favorite = document.createElement("span")
    favorite.className = "roastbook-visits-map-marker-favorite"
    favorite.setAttribute("aria-hidden", "true")
    favorite.append(createHeartIcon())
    marker.append(favorite)
  }

  marker.addEventListener("click", (event) => {
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
    marker.addEventListener("keydown", (event) => {
      const direction =
        event.key === "ArrowRight" || event.key === "ArrowDown"
          ? 1
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
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
    marker.setAttribute("aria-pressed", String(isSelected))
    marker.tabIndex = marker === tabbableMarker ? 0 : -1
    if (isSelected) {
      marker.setAttribute("aria-controls", "visits-map-place-inspector")
    } else {
      marker.removeAttribute("aria-controls")
    }
  }
  return displayedPlaceIds.find(
    (placeId) => markerElements.get(placeId) === tabbableMarker,
  ) ?? null
}

function createCoffeeCupIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", "currentColor")
  svg.setAttribute("stroke-width", "2")
  svg.setAttribute("stroke-linecap", "round")
  svg.setAttribute("stroke-linejoin", "round")

  const cup = document.createElementNS(SVG_NAMESPACE, "path")
  cup.setAttribute("d", "M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z")
  const handle = document.createElementNS(SVG_NAMESPACE, "path")
  handle.setAttribute("d", "M16 10h1.5a2.5 2.5 0 0 1 0 5H16")
  const steam = document.createElementNS(SVG_NAMESPACE, "path")
  steam.setAttribute("d", "M8 5c0-1 1-1 1-2m3 2c0-1 1-1 1-2")
  svg.append(cup, handle, steam)
  return svg
}

function createHeartIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("fill", "currentColor")
  const path = document.createElementNS(SVG_NAMESPACE, "path")
  path.setAttribute(
    "d",
    "M12 21s-7-4.35-9.33-8.55C.77 9.03 2.2 5 6.1 5A5.3 5.3 0 0 1 12 8.1 5.3 5.3 0 0 1 17.9 5c3.9 0 5.33 4.03 3.43 7.45C19 16.65 12 21 12 21Z",
  )
  svg.append(path)
  return svg
}
