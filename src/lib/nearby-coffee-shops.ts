export type NearbyCoffeeShopCandidate = {
  readonly id: string
  readonly name: string
  readonly displayName: string
  readonly latitude: string
  readonly longitude: string
  readonly openStreetMapUrl: string
  readonly address?: string
  readonly city?: string
  readonly country?: string
  readonly website?: string
}

export function parseNearbyCoffeeShops(
  payload: unknown,
): NearbyCoffeeShopCandidate[] {
  if (!isRecord(payload) || !Array.isArray(payload["elements"])) return []

  return payload["elements"].flatMap((element) => {
    if (!isRecord(element) || !isRecord(element["tags"])) return []
    const type = element["type"]
    const id = element["id"]
    const name = getTag(element["tags"], "name")
    if (!isElementType(type) || typeof id !== "number" || !name) return []

    const center = isRecord(element["center"]) ? element["center"] : null
    const latitude = toFiniteNumber(element["lat"] ?? center?.["lat"])
    const longitude = toFiniteNumber(element["lon"] ?? center?.["lon"])
    if (latitude === null || longitude === null) return []

    const street = getTag(element["tags"], "addr:street")
    const houseNumber = getTag(element["tags"], "addr:housenumber")
    const address = [street, houseNumber].filter(Boolean).join(" ") || undefined
    const city = getTag(element["tags"], "addr:city")
    const country = getTag(element["tags"], "addr:country")
    const website = normalizeWebsite(
      getTag(element["tags"], "website") ??
        getTag(element["tags"], "contact:website"),
    )
    const displayName = [name, address, city].filter(Boolean).join(", ")

    return [
      {
        id: `${type}:${id}`,
        name,
        displayName,
        latitude: String(latitude),
        longitude: String(longitude),
        openStreetMapUrl: `https://www.openstreetmap.org/${type}/${id}`,
        address,
        city,
        country,
        website,
      },
    ]
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isElementType(value: unknown): value is "node" | "way" | "relation" {
  return value === "node" || value === "way" || value === "relation"
}

function getTag(tags: Record<string, unknown>, key: string): string | undefined {
  const value = tags[key]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function normalizeWebsite(value: string | undefined): string | undefined {
  if (!value) return undefined
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}
