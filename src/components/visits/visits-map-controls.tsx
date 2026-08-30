import {
  Fullscreen,
  LoaderCircle,
  LocateFixed,
  Minus,
  Plus,
  Shrink,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { MapControlContainer } from '@/components/map/map-control-container'
import { useMapLibreMap } from '@/components/map/maplibre-map'
import { Button } from '@/components/ui/button'

type LocationStatus = 'idle' | 'locating' | 'located' | 'error'

export function VisitsMapControls({ ready }: { readonly ready: boolean }) {
  const { frameRef, map, maplibre } = useMapLibreMap()
  const locationMarkerRef = useRef<import('maplibre-gl').Marker | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenSupported, setFullscreenSupported] = useState(false)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle')
  const [message, setMessage] = useState('')
  const motionDuration = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300

  useEffect(() => {
    setFullscreenSupported(document.fullscreenEnabled)
    const synchronizeFullscreen = () => {
      setIsFullscreen(document.fullscreenElement === frameRef.current)
      map?.resize()
    }
    document.addEventListener('fullscreenchange', synchronizeFullscreen)
    return () =>
      document.removeEventListener('fullscreenchange', synchronizeFullscreen)
  }, [frameRef, map])

  useEffect(
    () => () => {
      locationMarkerRef.current?.remove()
    },
    [],
  )

  const locateUser = () => {
    if (!map || !maplibre || !navigator.geolocation) {
      setLocationStatus('error')
      setMessage('Your browser cannot provide a location.')
      return
    }
    setLocationStatus('locating')
    setMessage('Finding your location…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location: [number, number] = [coords.longitude, coords.latitude]
        locationMarkerRef.current?.remove()
        const markerElement = document.createElement('span')
        markerElement.className = 'roastbook-visits-map-user-location'
        markerElement.setAttribute('aria-hidden', 'true')
        locationMarkerRef.current = new maplibre.Marker({
          element: markerElement,
          anchor: 'center',
        })
          .setLngLat(location)
          .addTo(map)
        map.easeTo({
          center: location,
          zoom: Math.max(map.getZoom(), 14),
          duration: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 0
            : 500,
        })
        setLocationStatus('located')
        setMessage('Map centered on your location.')
      },
      (error) => {
        setLocationStatus('error')
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was not granted.'
            : 'Your location could not be determined.',
        )
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    )
  }

  return (
    <>
      <MapControlContainer className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        <div className="overflow-hidden rounded-xl border border-border bg-card/95 shadow-control backdrop-blur-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-none border-b border-border"
            aria-label="Zoom in"
            title="Zoom in"
            disabled={!ready || !map}
            onClick={() => map?.zoomIn({ duration: motionDuration() })}
          >
            <Plus aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-none"
            aria-label="Zoom out"
            title="Zoom out"
            disabled={!ready || !map}
            onClick={() => map?.zoomOut({ duration: motionDuration() })}
          >
            <Minus aria-hidden="true" />
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card/95 shadow-control backdrop-blur-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-none border-b border-border"
            aria-label="Center map on my location"
            title="Center on my location"
            disabled={!ready || !map || locationStatus === 'locating'}
            aria-pressed={locationStatus === 'located'}
            onClick={locateUser}
          >
            {locationStatus === 'locating' ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <LocateFixed aria-hidden="true" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-none"
            aria-label={
              isFullscreen ? 'Exit fullscreen map' : 'View fullscreen map'
            }
            title={
              fullscreenSupported
                ? isFullscreen
                  ? 'Exit fullscreen'
                  : 'View fullscreen'
                : 'Fullscreen is unavailable in this browser'
            }
            disabled={!ready || !fullscreenSupported}
            aria-pressed={isFullscreen}
            onClick={() => {
              if (isFullscreen) void document.exitFullscreen()
              else if (frameRef.current)
                void frameRef.current.requestFullscreen()
            }}
          >
            {isFullscreen ? (
              <Shrink aria-hidden="true" />
            ) : (
              <Fullscreen aria-hidden="true" />
            )}
          </Button>
        </div>
      </MapControlContainer>
      <p className="sr-only" aria-live="polite">
        {message}
      </p>
    </>
  )
}
