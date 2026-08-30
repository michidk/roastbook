import type { StyleSpecification } from 'maplibre-gl'
import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { cn } from '@/lib/utils'

const MAP_LOAD_TIMEOUT_MS = 8_000

export type MapColorScheme = 'light' | 'dark'

type MapLibreModule = typeof import('maplibre-gl')

type MapLibreContextValue = {
  readonly frameRef: RefObject<HTMLDivElement | null>
  readonly map: import('maplibre-gl').Map | null
  readonly maplibre: MapLibreModule | null
}

const MapLibreContext = createContext<MapLibreContextValue | null>(null)

type MapLibreMapProps = {
  readonly ariaHidden: boolean
  readonly ariaLabel: string
  readonly attempt: number
  readonly center: readonly [number, number]
  readonly children?: ReactNode
  readonly className?: string
  readonly loadStyle: (scheme: MapColorScheme) => Promise<StyleSpecification>
  readonly onError: (error: unknown) => void
  readonly onLoad: () => void
  readonly onMapClick: () => void
  readonly zoom: number
}

function getMapColorScheme(): MapColorScheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * Roastbook's small declarative boundary around MapLibre lifecycle and theming.
 * Feature layers and controls compose as children through `useMapLibreMap`.
 */
export function MapLibreMap({
  ariaHidden,
  ariaLabel,
  attempt,
  center,
  children,
  className,
  loadStyle,
  onError,
  onLoad,
  onMapClick,
  zoom,
}: MapLibreMapProps) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)
  const callbacksRef = useRef({ loadStyle, onError, onLoad, onMapClick })
  const [map, setMap] = useState<import('maplibre-gl').Map | null>(null)
  const [maplibre, setMapLibre] = useState<MapLibreModule | null>(null)
  callbacksRef.current = { loadStyle, onError, onLoad, onMapClick }

  // `attempt` intentionally reconstructs the renderer after an explicit retry.
  // biome-ignore lint/correctness/useExhaustiveDependencies: initial view state is fixed for each attempt
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let disposed = false
    let failed = false
    let styleRevision = 0
    let loadTimeout: ReturnType<typeof setTimeout> | null = null
    let instance: import('maplibre-gl').Map | null = null

    const fail = (error: unknown) => {
      if (disposed || failed) return
      failed = true
      if (loadTimeout) clearTimeout(loadTimeout)
      loadTimeout = null
      callbacksRef.current.onError(error)
    }

    void (async () => {
      try {
        const initialScheme = getMapColorScheme()
        const [module, style] = await Promise.all([
          import('maplibre-gl'),
          callbacksRef.current.loadStyle(initialScheme),
        ])
        if (disposed) return

        instance = new module.Map({
          container,
          style,
          center: [...center],
          zoom,
          attributionControl: false,
        })
        setMapLibre(module)
        setMap(instance)
        loadTimeout = setTimeout(
          () => fail('Map loading timed out'),
          MAP_LOAD_TIMEOUT_MS,
        )

        instance.on('load', () => {
          if (disposed || failed) return
          if (loadTimeout) clearTimeout(loadTimeout)
          loadTimeout = null
          callbacksRef.current.onLoad()
        })
        instance.on('error', (event) => fail(event.error))
        instance.on('click', () => callbacksRef.current.onMapClick())

        const resizeObserver = new ResizeObserver(() => instance?.resize())
        resizeObserver.observe(container)

        let appliedScheme = initialScheme
        const themeObserver = new MutationObserver(() => {
          const nextScheme = getMapColorScheme()
          if (nextScheme === appliedScheme || !instance || failed) return
          const revision = ++styleRevision
          void callbacksRef.current
            .loadStyle(nextScheme)
            .then((nextStyle) => {
              if (disposed || failed || revision !== styleRevision || !instance)
                return
              appliedScheme = nextScheme
              instance.setStyle(nextStyle)
            })
            // Keep the working style if a theme-only refresh cannot be fetched.
            .catch(() => undefined)
        })
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        })

        instance.once('remove', () => {
          resizeObserver.disconnect()
          themeObserver.disconnect()
        })
      } catch (error) {
        fail(error)
      }
    })()

    return () => {
      disposed = true
      if (loadTimeout) clearTimeout(loadTimeout)
      instance?.remove()
      setMap(null)
      setMapLibre(null)
    }
  }, [attempt])

  const context = useMemo(() => ({ frameRef, map, maplibre }), [map, maplibre])

  return (
    <MapLibreContext.Provider value={context}>
      <div
        ref={frameRef}
        className={cn('roastbook-map-frame relative', className)}
      >
        <section
          ref={containerRef}
          className="roastbook-visits-map h-full w-full"
          aria-label={ariaLabel}
          aria-hidden={ariaHidden}
          inert={ariaHidden}
        />
        {children}
      </div>
    </MapLibreContext.Provider>
  )
}

export function useMapLibreMap(): MapLibreContextValue {
  const context = useContext(MapLibreContext)
  if (!context) {
    throw new Error('useMapLibreMap must be used inside MapLibreMap')
  }
  return context
}
