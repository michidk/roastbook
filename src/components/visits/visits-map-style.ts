import type { StyleSpecification } from 'maplibre-gl'
import type { MapColorScheme } from '@/components/map/maplibre-map'
import { DEMO_MODE } from '@/lib/build-mode'

const VISITS_BASEMAP_STYLE_URLS = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} satisfies Record<MapColorScheme, string>

export async function loadVisitsBasemapStyle(
  scheme: MapColorScheme,
): Promise<StyleSpecification> {
  if (DEMO_MODE)
    throw new Error('Map services are unavailable in the browser demo')
  const response = await fetch(VISITS_BASEMAP_STYLE_URLS[scheme], {
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) {
    throw new Error(`OpenFreeMap style request failed (${response.status})`)
  }

  const style = (await response.json()) as StyleSpecification
  return {
    ...style,
    layers: style.layers.filter((layer) => layer.type !== 'symbol'),
  }
}
