import { useEffect, useMemo, useRef, useState } from "react"
import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  StyleSpecification,
} from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { cn } from "@/lib/utils"
import { CoffeeShopMapStatus } from "./coffee-shop-map-status"
import {
  getMappableCoffeeShops,
  type MapStatus,
  type CoffeeShopMapItem,
} from "./coffee-shop-map-utils"
import {
  createCoffeeShopMarkerElement,
  createCoffeeShopPopupContent,
} from "./coffee-shop-map-popup"

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
  layers: [{ id: "openStreetMap", type: "raster", source: "openStreetMap" }],
}

const MAP_LOAD_TIMEOUT_MS = 8_000

export function CoffeeShopMap({
  coffeeShops,
  className,
  heightClassName = "h-[360px] md:h-[420px]",
}: {
  coffeeShops: CoffeeShopMapItem[]
  className?: string
  heightClassName?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<MapLibreMarker[]>([])
  const mapHadErrorRef = useRef(false)
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading")
  const [mapAttempt, setMapAttempt] = useState(0)
  const mappableCoffeeShops = useMemo(() => getMappableCoffeeShops(coffeeShops), [coffeeShops])

  useEffect(() => {
    if (!containerRef.current || mappableCoffeeShops.length === 0 || mapRef.current) {
      return
    }

    let isDisposed = false
    let cleanup: (() => void) | undefined

    void (async () => {
      try {
        const maplibregl = await import("maplibre-gl")

        if (isDisposed || !containerRef.current) return

        const initialCoffeeShop = mappableCoffeeShops[0]
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: BASEMAP_STYLE,
          center: initialCoffeeShop ? [initialCoffeeShop.longitude, initialCoffeeShop.latitude] : [0, 0],
          zoom: initialCoffeeShop ? 12 : 2,
          attributionControl: false,
        })

        mapHadErrorRef.current = false
        loadTimeoutRef.current = setTimeout(() => {
          if (!isDisposed) {
            mapHadErrorRef.current = true
            setMapStatus("error")
          }
        }, MAP_LOAD_TIMEOUT_MS)
        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right")
        map.on("idle", () => {
          if (!isDisposed && !mapHadErrorRef.current) {
            if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
            loadTimeoutRef.current = null
            setMapReady(true)
            setMapStatus("ready")
          }
        })
        map.on("error", (event) => {
          console.error("Coffee shop map failed", event.error)
          if (!isDisposed) {
            mapHadErrorRef.current = true
            if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
            loadTimeoutRef.current = null
            setMapStatus("error")
          }
        })

        mapRef.current = map
        const resizeObserver = new ResizeObserver(() => {
          if (!isDisposed) map.resize()
        })
        resizeObserver.observe(containerRef.current)
        cleanup = () => {
          resizeObserver.disconnect()
          markersRef.current.forEach((marker) => marker.remove())
          markersRef.current = []
          if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
          loadTimeoutRef.current = null
          setMapReady(false)
          setMapStatus("loading")
          map.remove()
          mapRef.current = null
        }
      } catch (error) {
        if (error instanceof Error) {
          if (!isDisposed) setMapStatus("error")
          return
        }
        throw error
      }
    })()

    return () => {
      isDisposed = true
      cleanup?.()
    }
  }, [mapAttempt, mappableCoffeeShops])

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

      for (const coffeeShop of mappableCoffeeShops) {
        const markerElement = createCoffeeShopMarkerElement(coffeeShop)
        const popupContent = createCoffeeShopPopupContent(coffeeShop)

        const popup = new maplibregl.Popup({
          offset: 8,
          closeButton: false,
          closeOnClick: false,
          className: "roastbook-map-popup",
        })
          .setLngLat([coffeeShop.longitude, coffeeShop.latitude])
          .setDOMContent(popupContent)
        const marker = new maplibregl.Marker({ element: markerElement, anchor: "bottom" })
          .setLngLat([coffeeShop.longitude, coffeeShop.latitude])
          .setPopup(popup)
          .addTo(map)

        let isPopupHovered = false
        let isPopupPinned = false
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
            if (!isPopupHovered && !isPopupPinned) {
              popup.remove()
            }
          }, 120)
        }

        markerElement.addEventListener("mouseenter", () => {
          clearCloseTimeout()
          popup.addTo(map)
        })

        markerElement.addEventListener("mouseleave", closePopupIfIdle)
        markerElement.addEventListener("click", (event) => {
          event.stopPropagation()
          clearCloseTimeout()
          isPopupPinned = !isPopupPinned
          if (isPopupPinned) {
            popup.addTo(map)
          } else {
            popup.remove()
          }
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
        bounds.extend([coffeeShop.longitude, coffeeShop.latitude])
      }

      if (mappableCoffeeShops.length === 1) {
        const coffeeShop = mappableCoffeeShops[0]
        map.easeTo({ center: [coffeeShop.longitude, coffeeShop.latitude], zoom: 14, duration: 0 })
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
  }, [mapReady, mappableCoffeeShops])

  const retryMap = () => {
    setMapStatus("loading")
    setMapAttempt((attempt) => attempt + 1)
  }

  if (mappableCoffeeShops.length === 0) {
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
            Add latitude and longitude to coffee shop entries to render them on the map.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <div className="relative">
        <div ref={containerRef} className={cn("w-full", heightClassName)} />
        <CoffeeShopMapStatus status={mapStatus} coffeeShops={mappableCoffeeShops} onRetry={retryMap} />
      </div>
      <div className="border-t bg-card px-4 py-3 text-xs text-muted-foreground">
        Map data and basemap © OpenStreetMap contributors
      </div>
    </div>
  )
}
