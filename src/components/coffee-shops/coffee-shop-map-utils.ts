export type CoffeeShopMapItem = {
  readonly id: number | string
  readonly name: string
  readonly latitude?: string | number | null
  readonly longitude?: string | number | null
  readonly address?: string | null
  readonly city?: string | null
  readonly country?: string | null
  readonly website?: string | null
}

export type MappableCoffeeShop = {
  readonly id: number | string
  readonly name: string
  readonly latitude: number
  readonly longitude: number
  readonly address?: string | null
  readonly city?: string | null
  readonly country?: string | null
  readonly website?: string | null
}

export type MapStatus = "loading" | "ready" | "error"

export function parseCoordinate(
  value: string | number | null | undefined,
  axis?: "latitude" | "longitude",
): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed)) return null
  if (axis === "latitude" && Math.abs(parsed) > 90) return null
  if (axis === "longitude" && Math.abs(parsed) > 180) return null
  return parsed
}

export function getMappableCoffeeShops(
  coffeeShops: readonly CoffeeShopMapItem[],
): MappableCoffeeShop[] {
  return coffeeShops.flatMap((coffeeShop) => {
    const latitude = parseCoordinate(coffeeShop.latitude, "latitude")
    const longitude = parseCoordinate(coffeeShop.longitude, "longitude")
    return latitude === null || longitude === null
      ? []
      : [{ ...coffeeShop, latitude, longitude }]
  })
}

export function getSubtitle(
  coffeeShop: Pick<MappableCoffeeShop, "address" | "city" | "country">,
): string {
  if (coffeeShop.address) return coffeeShop.address
  return [coffeeShop.city, coffeeShop.country].filter(Boolean).join(", ") || "Saved coffee shop"
}

export function getOpenStreetMapUrl(
  coffeeShop: Pick<MappableCoffeeShop, "latitude" | "longitude">,
): string {
  return `https://www.openstreetmap.org/?mlat=${coffeeShop.latitude}&mlon=${coffeeShop.longitude}#map=18/${coffeeShop.latitude}/${coffeeShop.longitude}`
}
