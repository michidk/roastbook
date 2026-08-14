import { parseCoordinate } from '@/components/coffee-shops/coffee-shop-map-utils'

export type SavedPlaceInput = {
  readonly id: number
  readonly name: string
  readonly address: string | null
  readonly city: string | null
  readonly country: string | null
  readonly latitude: string | number | null
  readonly longitude: string | number | null
  readonly website: string | null
  readonly rating: number | null
  readonly isFavorite: boolean
  readonly visitCount?: number
}

export type PlaceVisitInput = {
  readonly coffeeShopId: number | null
}

type MapPlaceBase = {
  readonly id: string
  readonly name: string
  readonly address: string | null
  readonly city: string | null
  readonly country: string | null
  readonly latitude: number
  readonly longitude: number
  readonly website: string | null
}

export type SavedMapPlace = MapPlaceBase & {
  readonly coffeeShopId: number
  readonly rating: number | null
  readonly isFavorite: boolean
  readonly visitCount: number
}

export type MapMarkerVariant = 'favorite' | 'saved'

export function toSavedMapPlaces(
  coffeeShops: readonly SavedPlaceInput[],
  visits: readonly PlaceVisitInput[],
): SavedMapPlace[] {
  const visitsByCoffeeShop = new Map<number, number>()
  for (const visit of visits) {
    if (visit.coffeeShopId === null) continue
    visitsByCoffeeShop.set(
      visit.coffeeShopId,
      (visitsByCoffeeShop.get(visit.coffeeShopId) ?? 0) + 1,
    )
  }

  return coffeeShops.flatMap((coffeeShop) => {
    const latitude = parseCoordinate(coffeeShop.latitude, 'latitude')
    const longitude = parseCoordinate(coffeeShop.longitude, 'longitude')
    if (latitude === null || longitude === null) return []

    return [
      {
        id: `saved:${coffeeShop.id}`,
        coffeeShopId: coffeeShop.id,
        name: coffeeShop.name,
        address: coffeeShop.address,
        city: coffeeShop.city,
        country: coffeeShop.country,
        latitude,
        longitude,
        website: coffeeShop.website,
        rating: coffeeShop.rating,
        isFavorite: coffeeShop.isFavorite,
        visitCount:
          coffeeShop.visitCount ?? visitsByCoffeeShop.get(coffeeShop.id) ?? 0,
      },
    ]
  })
}

export function getMapMarkerVariant(place: SavedMapPlace): MapMarkerVariant {
  return place.isFavorite ? 'favorite' : 'saved'
}
