import { useEffect, useRef, useState } from "react"
import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  StyleSpecification,
} from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createVisitsMapMarkerElement } from "./visits-map-marker"
import type { VisitsMapPlace } from "./visits-map-utils"

const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    openStreetMap: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "openStreetMap",
      type: "raster",
      source: "openStreetMap",
      paint: {
        "raster-saturation": -0.55,
        "raster-contrast": -0.08,
      },
    },
  ],
}

type VisitsMapCanvasProps = {
  readonly places: readonly VisitsMapPlace[]
  readonly selectedPlaceId: string | null
  readonly onSelectPlace: (
    placeId: string | null,
    focusInspector?: boolean,
  ) => void
}

export function VisitsMapCanvas({
  places,
  selectedPlaceId,
  onSelectPlace,
}: VisitsMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Map<string, MapLibreMarker>>(new Map())
  const markerElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [mapAttempt, setMapAttempt] = useState(0)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let disposed = false

    void import("maplibre-gl").then((maplibregl) => {
      if (disposed) return
      const firstPlace = places[0]
      const map = new maplibregl.Map({
        container,
        style: BASEMAP_STYLE,
        center: firstPlace
          ? [firstPlace.longitude, firstPlace.latitude]
          : [10, 48],
        zoom: firstPlace ? 11 : 3,
        attributionControl: false,
      })
      mapRef.current = map
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      )
      map.on("load", () => {
        if (!disposed) setStatus("ready")
      })
      map.on("error", () => {
        if (!disposed) setStatus("error")
      })
      map.on("click", () => onSelectPlace(null))

      const resizeObserver = new ResizeObserver(() => map.resize())
      resizeObserver.observe(container)
      map.once("remove", () => resizeObserver.disconnect())
    })

    return () => {
      disposed = true
      for (const marker of markersRef.current.values()) marker.remove()
      markersRef.current.clear()
      markerElementsRef.current.clear()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [mapAttempt])

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return
    const map = mapRef.current
    let disposed = false

    void import("maplibre-gl").then((maplibregl) => {
      if (disposed) return
      for (const marker of markersRef.current.values()) marker.remove()
      markersRef.current.clear()
      markerElementsRef.current.clear()
      const bounds = new maplibregl.LngLatBounds()

      for (const place of places) {
        const element = createVisitsMapMarkerElement(place, onSelectPlace)
        const isSelected = place.id === selectedPlaceId
        element.dataset.selected = String(isSelected)
        if (isSelected) {
          element.setAttribute("aria-controls", "visits-map-place-inspector")
        }
        const marker = new maplibregl.Marker({ element, anchor: "bottom" })
          .setLngLat([place.longitude, place.latitude])
          .addTo(map)
        markersRef.current.set(place.id, marker)
        markerElementsRef.current.set(place.id, element)
        bounds.extend([place.longitude, place.latitude])
      }

      if (places.length === 1) {
        const place = places[0]
        if (place) map.jumpTo({ center: [place.longitude, place.latitude], zoom: 14 })
      } else if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 72, duration: 0, maxZoom: 13 })
      }

      const selectedPlace = places.find((place) => place.id === selectedPlaceId)
      if (selectedPlace) {
        requestAnimationFrame(() => positionSelectedPlace(map, selectedPlace))
      }
    })

    return () => {
      disposed = true
    }
  }, [onSelectPlace, places, selectedPlaceId, status])

  return (
    <div className="relative h-[460px] w-full md:h-[540px]">
      <div
        ref={containerRef}
        className="roastbook-visits-map h-full w-full"
        aria-label="Map of saved and discovered cafés"
      />
      {status === "loading" && (
        <div className="absolute inset-0 z-10" role="status" aria-label="Loading café map">
          <Skeleton className="h-full w-full rounded-none" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-secondary/95 p-6 text-center" role="alert">
          <div className="max-w-sm space-y-3">
            <p className="font-display text-lg font-bold">Map unavailable</p>
            <p className="text-sm text-muted-foreground">
              The café list is still available. Retry when the map service is reachable.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStatus("loading")
                setMapAttempt((attempt) => attempt + 1)
              }}
            >
              Retry map
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function positionSelectedPlace(
  map: MapLibreMap,
  place: VisitsMapPlace,
): void {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const mobile = window.matchMedia("(max-width: 639px)").matches
  map.easeTo({
    center: [place.longitude, place.latitude],
    zoom: 14,
    offset: mobile ? [0, -112] : [0, -52],
    duration: reduceMotion ? 0 : 350,
  })
}
