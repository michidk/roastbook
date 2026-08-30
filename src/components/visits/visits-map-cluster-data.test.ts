import { describe, expect, test } from 'bun:test'

import { createVisitsMapFeatureCollection } from './visits-map-cluster-data'
import type { SavedMapPlace } from './visits-map-utils'

const place: SavedMapPlace = {
  id: 'saved:7',
  coffeeShopId: 7,
  name: 'Signal Coffee',
  address: null,
  city: 'Berlin',
  country: 'Germany',
  latitude: 52.52,
  longitude: 13.405,
  website: null,
  updatedAt: '2026-08-30T00:00:00Z',
  rating: null,
  isFavorite: false,
  wantsToVisit: false,
  visitCount: 0,
}

describe('createVisitsMapFeatureCollection', () => {
  test('projects saved places into stable point features', () => {
    expect(createVisitsMapFeatureCollection([place])).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'saved:7',
          properties: { placeId: 'saved:7' },
          geometry: { type: 'Point', coordinates: [13.405, 52.52] },
        },
      ],
    })
  })
})
