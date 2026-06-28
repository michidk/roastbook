import { createServerFn } from "@tanstack/react-start"

type NominatimResult = {
  place_id?: number
  display_name?: string
  lat?: string
  lon?: string
  osm_type?: "node" | "way" | "relation"
  osm_id?: number | string
  class?: string
  type?: string
  address?: {
    house_number?: string
    road?: string
    pedestrian?: string
    suburb?: string
    neighbourhood?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
    county?: string
    state?: string
    country?: string
  }
  extratags?: {
    website?: string
    "contact:website"?: string
    url?: string
  }
}

function toOpenStreetMapUrl(result: Pick<NominatimResult, "osm_type" | "osm_id" | "lat" | "lon">) {
  if (!result.osm_type || !result.osm_id || !result.lat || !result.lon) {
    return undefined
  }

  return `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}#map=19/${result.lat}/${result.lon}`
}

function normalizeQuery(query: string) {
  const normalized = query.trim().replace(/\s+/g, " ")

  if (normalized.length < 3) {
    throw new Error("Search query must be at least 3 characters")
  }

  return normalized
}

function toAddressLine(address: NominatimResult["address"]) {
  if (!address) {
    return undefined
  }

  const street = [address.house_number, address.road ?? address.pedestrian]
    .filter(Boolean)
    .join(" ")

  return street || address.neighbourhood || address.suburb || undefined
}

function toCity(address: NominatimResult["address"]) {
  return address?.city ?? address?.town ?? address?.village ?? address?.municipality ?? undefined
}

function toWebsite(extratags: NominatimResult["extratags"]) {
  const candidate = extratags?.website ?? extratags?.["contact:website"] ?? extratags?.url

  if (!candidate) {
    return undefined
  }

  const trimmed = candidate.trim()

  if (!trimmed) {
    return undefined
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export const searchPlaceCandidates = createServerFn({ method: "POST" })
  .validator((data: { query: string; limit?: number }) => ({
    query: normalizeQuery(data.query),
    limit: Math.min(Math.max(data.limit ?? 5, 1), 5),
  }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      q: data.query,
      format: "jsonv2",
      addressdetails: "1",
      extratags: "1",
      limit: String(data.limit),
    })

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Roastbook/1.0 (self-hosted coffee journal geocoding)",
      },
    })

    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status}`)
    }

    const payload = (await response.json()) as NominatimResult[]

    return payload.flatMap((item) => {
      if (!item.place_id || !item.display_name || !item.lat || !item.lon) {
        return []
      }

      const latitude = Number(item.lat)
      const longitude = Number(item.lon)

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return []
      }

      return [
        {
          id: item.place_id,
          name: item.display_name.split(",")[0]?.trim() || item.display_name,
          displayName: item.display_name,
          latitude: String(latitude),
          longitude: String(longitude),
          osmType: item.osm_type,
          osmId: item.osm_id ? String(item.osm_id) : undefined,
          osmClass: item.class,
          osmValueType: item.type,
          openStreetMapUrl: toOpenStreetMapUrl(item),
          address: toAddressLine(item.address),
          city: toCity(item.address),
          country: item.address?.country,
          website: toWebsite(item.extratags),
        },
      ]
    })
  })
