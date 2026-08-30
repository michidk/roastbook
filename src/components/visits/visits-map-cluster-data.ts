import type { FeatureCollection, Point } from 'geojson'

import type { SavedMapPlace } from './visits-map-utils'

export type VisitsMapPointProperties = {
  readonly placeId: string
}

export function createVisitsMapFeatureCollection(
  places: readonly SavedMapPlace[],
): FeatureCollection<Point, VisitsMapPointProperties> {
  return {
    type: 'FeatureCollection',
    features: places.map((place) => ({
      type: 'Feature',
      id: place.id,
      properties: { placeId: place.id },
      geometry: {
        type: 'Point',
        coordinates: [place.longitude, place.latitude],
      },
    })),
  }
}
