import { parseCoordinate } from "@/components/coffee-shops/coffee-shop-map-utils"

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
}

export type PlaceVisitInput = {
  readonly coffeeShopId: number | null
}

export type DiscoveredPlaceInput = {
  readonly id: number | string
  readonly name: string
  readonly displayName: string
  readonly latitude: string
  readonly longitude: string
  readonly openStreetMapUrl?: string
  readonly address?: string
  readonly city?: string
  readonly country?: string
  readonly website?: string
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
  readonly kind: "saved"
  readonly coffeeShopId: number
  readonly rating: number | null
  readonly isFavorite: boolean
  readonly visitCount: number
}

export type DiscoveredMapPlace = MapPlaceBase & {
  readonly kind: "discovered"
  readonly sourceId: number | string
  readonly displayName: string
  readonly openStreetMapUrl: string | null
}

export type VisitsMapPlace = SavedMapPlace | DiscoveredMapPlace
export type MapMarkerVariant = "favorite" | "saved" | "discovered"

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
    const latitude = parseCoordinate(coffeeShop.latitude, "latitude")
    const longitude = parseCoordinate(coffeeShop.longitude, "longitude")
    if (latitude === null || longitude === null) return []

    return [
      {
        kind: "saved" as const,
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
        visitCount: visitsByCoffeeShop.get(coffeeShop.id) ?? 0,
      },
    ]
  })
}

export function toDiscoveredMapPlaces(
  candidates: readonly DiscoveredPlaceInput[],
): DiscoveredMapPlace[] {
  return candidates.flatMap((candidate) => {
    const latitude = parseCoordinate(candidate.latitude, "latitude")
    const longitude = parseCoordinate(candidate.longitude, "longitude")
    if (latitude === null || longitude === null) return []

    return [
      {
        kind: "discovered" as const,
        id: `discovered:${candidate.id}`,
        sourceId: candidate.id,
        name: candidate.name,
        displayName: candidate.displayName,
        address: candidate.address ?? null,
        city: candidate.city ?? null,
        country: candidate.country ?? null,
        latitude,
        longitude,
        website: candidate.website ?? null,
        openStreetMapUrl: candidate.openStreetMapUrl ?? null,
      },
    ]
  })
}

export function getVisibleMapPlaces(
  savedPlaces: readonly SavedMapPlace[],
  discoveredPlaces: readonly DiscoveredMapPlace[],
): VisitsMapPlace[] {
  return [
    ...savedPlaces,
    ...discoveredPlaces.filter(
      (discovered) =>
        !savedPlaces.some((saved) => isSameCoffeeShop(saved, discovered)),
    ),
  ]
}

export function getMapMarkerVariant(place: VisitsMapPlace): MapMarkerVariant {
  if (place.kind === "discovered") return "discovered"
  return place.isFavorite ? "favorite" : "saved"
}

function isSameCoffeeShop(
  saved: SavedMapPlace,
  discovered: DiscoveredMapPlace,
): boolean {
  const sameName = normalizeName(saved.name) === normalizeName(discovered.name)
  const latitudeDistance = Math.abs(saved.latitude - discovered.latitude)
  const longitudeDistance = Math.abs(saved.longitude - discovered.longitude)
  return sameName && latitudeDistance < 0.0005 && longitudeDistance < 0.0005
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "")
}
