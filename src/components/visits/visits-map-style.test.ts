import { afterEach, describe, expect, mock, test } from 'bun:test'

import { loadVisitsBasemapStyle } from './visits-map-style'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('loadVisitsBasemapStyle', () => {
  test('loads the matching keyless style and removes map labels', async () => {
    const requests: string[] = []
    globalThis.fetch = mock(async (input) => {
      requests.push(String(input))
      return new Response(
        JSON.stringify({
          version: 8,
          sources: {},
          layers: [
            { id: 'background', type: 'background' },
            { id: 'labels', type: 'symbol' },
          ],
        }),
      )
    }) as unknown as typeof fetch

    const light = await loadVisitsBasemapStyle('light')
    const dark = await loadVisitsBasemapStyle('dark')

    expect(requests).toEqual([
      'https://tiles.openfreemap.org/styles/positron',
      'https://tiles.openfreemap.org/styles/dark',
    ])
    expect(light.layers.map((layer) => layer.id)).toEqual(['background'])
    expect(dark.layers.map((layer) => layer.id)).toEqual(['background'])
  })
})
