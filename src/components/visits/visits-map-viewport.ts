import type { Map as MapLibreMap } from "maplibre-gl"
import type { SavedMapPlace } from "./visits-map-utils"

export function positionSelectedMapPlace(
  map: MapLibreMap,
  place: SavedMapPlace,
): void {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches
  const mobile = window.matchMedia("(max-width: 639px)").matches
  map.easeTo({
    center: [place.longitude, place.latitude],
    zoom: 14,
    offset: mobile ? [0, -112] : [0, -52],
    duration: reduceMotion ? 0 : 350,
  })
}
