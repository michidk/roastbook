import { useEffect, useMemo, useRef, useState } from "react"
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { cn } from "@/lib/utils"

type PlaceMapItem = {
  id: number | string
  name: string
  latitude?: string | number | null
  longitude?: string | number | null
  address?: string | null
  city?: string | null
  country?: string | null
  website?: string | null
}

type MappablePlace = {
  id: number | string
  name: string
  latitude: number
  longitude: number
  address?: string | null
  city?: string | null
  country?: string | null
  website?: string | null
}

function parseCoordinate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getSubtitle(place: Pick<MappablePlace, "address" | "city" | "country">) {
  if (place.address) {
    return place.address
  }

  const fallback = [place.city, place.country].filter(Boolean).join(", ")
  return fallback || "Saved place"
}

function getOpenStreetMapUrl(place: Pick<MappablePlace, "latitude" | "longitude">) {
  return `https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=18/${place.latitude}/${place.longitude}`
}

export function PlaceMap({
  places,
  className,
  heightClassName = "h-[360px] md:h-[420px]",
}: {
  places: PlaceMapItem[]
  className?: string
  heightClassName?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<MapLibreMarker[]>([])
  const [mapReady, setMapReady] = useState(false)

  const mappablePlaces = useMemo<MappablePlace[]>(() => {
    return places.flatMap((place) => {
      const latitude = parseCoordinate(place.latitude)
      const longitude = parseCoordinate(place.longitude)

      if (latitude === null || longitude === null) {
        return []
      }

      return [{
        id: place.id,
        name: place.name,
        latitude,
        longitude,
        address: place.address,
        city: place.city,
        country: place.country,
        website: place.website,
      }]
    })
  }, [places])

  useEffect(() => {
    if (!containerRef.current || mappablePlaces.length === 0 || mapRef.current) {
      return
    }

    let isDisposed = false
    let cleanup: (() => void) | undefined

    void (async () => {
      const maplibregl = await import("maplibre-gl")

      if (isDisposed || !containerRef.current) {
        return
      }

      const initialPlace = mappablePlaces[0]
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: initialPlace ? [initialPlace.longitude, initialPlace.latitude] : [0, 0],
        zoom: initialPlace ? 12 : 2,
        attributionControl: false,
      })

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right")
      map.on("load", () => {
        if (!isDisposed) {
          setMapReady(true)
        }
      })

      mapRef.current = map
      cleanup = () => {
        markersRef.current.forEach((marker) => marker.remove())
        markersRef.current = []
        setMapReady(false)
        map.remove()
        mapRef.current = null
      }
    })()

    return () => {
      isDisposed = true
      cleanup?.()
    }
  }, [mappablePlaces])

  useEffect(() => {
    if (!mapReady || !mapRef.current) {
      return
    }

    let isDisposed = false

    void (async () => {
      const maplibregl = await import("maplibre-gl")
      const map = mapRef.current

      if (isDisposed || !map) {
        return
      }

      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      const bounds = new maplibregl.LngLatBounds()

      for (const place of mappablePlaces) {
        const markerElement = document.createElement("button")
        markerElement.type = "button"
        markerElement.className =
          "flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary shadow-md transition-[box-shadow,background-color] hover:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

        const markerDot = document.createElement("span")
        markerDot.className = "size-2 rounded-full bg-primary-foreground"
        markerElement.appendChild(markerDot)

        const popupContent = document.createElement("div")
        popupContent.className = "w-[220px] space-y-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-900 shadow-lg"

        const header = document.createElement("div")
        header.className = "space-y-1"

        const title = document.createElement("p")
        title.className = "font-semibold leading-tight"
        title.textContent = place.name

        const subtitle = document.createElement("p")
        subtitle.className = "text-sm leading-snug text-slate-600"
        subtitle.textContent = getSubtitle(place)

        header.append(title, subtitle)
        popupContent.append(header)

        const meta = document.createElement("div")
        meta.className = "flex flex-wrap gap-2"

        const locationBadge = document.createElement("span")
        locationBadge.className = "rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
        locationBadge.textContent = [place.city, place.country].filter(Boolean).join(", ") || "Saved place"
        meta.appendChild(locationBadge)

        const coordsBadge = document.createElement("span")
        coordsBadge.className = "rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900"
        coordsBadge.textContent = `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`
        meta.appendChild(coordsBadge)

        popupContent.append(meta)

        const links = document.createElement("div")
        links.className = "flex flex-wrap gap-2"

        const osmLink = document.createElement("a")
        osmLink.href = getOpenStreetMapUrl(place)
        osmLink.target = "_blank"
        osmLink.rel = "noopener noreferrer"
        osmLink.className =
          "inline-flex items-center rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        osmLink.textContent = "OpenStreetMap"
        links.appendChild(osmLink)

        if (place.website) {
          const websiteLink = document.createElement("a")
          websiteLink.href = place.website
          websiteLink.target = "_blank"
          websiteLink.rel = "noopener noreferrer"
          websiteLink.className =
            "inline-flex items-center rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          websiteLink.textContent = "Website"
          links.appendChild(websiteLink)
        }

        popupContent.append(links)

        const popup = new maplibregl.Popup({ offset: 16, closeButton: false, closeOnClick: false }).setDOMContent(popupContent)
        const marker = new maplibregl.Marker({ element: markerElement, anchor: "bottom" })
          .setLngLat([place.longitude, place.latitude])
          .setPopup(popup)
          .addTo(map)

        let isPopupHovered = false
        let closeTimeout: ReturnType<typeof setTimeout> | null = null

        const clearCloseTimeout = () => {
          if (closeTimeout) {
            clearTimeout(closeTimeout)
            closeTimeout = null
          }
        }

        const closePopupIfIdle = () => {
          clearCloseTimeout()
          closeTimeout = setTimeout(() => {
            if (!isPopupHovered) {
              popup.remove()
            }
          }, 120)
        }

        markerElement.addEventListener("mouseenter", () => {
          clearCloseTimeout()
          popup.addTo(map)
        })

        markerElement.addEventListener("mouseleave", closePopupIfIdle)
        markerElement.addEventListener("click", () => {
          clearCloseTimeout()
          popup.addTo(map)
        })

        popupContent.addEventListener("mouseenter", () => {
          isPopupHovered = true
          clearCloseTimeout()
        })

        popupContent.addEventListener("mouseleave", () => {
          isPopupHovered = false
          closePopupIfIdle()
        })

        markersRef.current.push(marker)
        bounds.extend([place.longitude, place.latitude])
      }

      if (mappablePlaces.length === 1) {
        const place = mappablePlaces[0]
        map.easeTo({ center: [place.longitude, place.latitude], zoom: 14, duration: 0 })
      } else if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 56, duration: 0, maxZoom: 14 })
      }

      requestAnimationFrame(() => {
        map.resize()
      })
    })()

    return () => {
      isDisposed = true
    }
  }, [mapReady, mappablePlaces])

  if (mappablePlaces.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-dashed bg-muted/40 px-6 text-center",
          heightClassName,
          className,
        )}
      >
        <div className="space-y-2">
          <p className="font-medium">No coordinates yet</p>
          <p className="text-sm text-muted-foreground">
            Add latitude and longitude to place entries to render them on the map.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <div ref={containerRef} className={cn("w-full", heightClassName)} />
      <div className="border-t bg-card px-4 py-3 text-xs text-muted-foreground">
        Map data © OpenStreetMap contributors · Basemap © CARTO
      </div>
    </div>
  )
}
