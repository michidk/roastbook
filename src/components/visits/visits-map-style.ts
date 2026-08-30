import type { StyleSpecification } from 'maplibre-gl'

const VISITS_BASEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

export async function loadVisitsBasemapStyle(): Promise<StyleSpecification> {
  const response = await fetch(VISITS_BASEMAP_STYLE_URL, {
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
