import { createServerFn } from "@tanstack/react-start"
import { prioritizeCoffeeShopCandidates } from "@/lib/geocoding-ranking"

const NOMINATIM_CANDIDATE_LIMIT = 40

type NominatimResult = {
  readonly place_id?: number
  readonly display_name?: string
  readonly lat?: string
  readonly lon?: string
  readonly osm_type?: "node" | "way" | "relation"
  readonly osm_id?: number | string
  readonly category?: string
  readonly class?: string
  readonly type?: string
  readonly address?: {
    readonly house_number?: string
    readonly road?: string
    readonly pedestrian?: string
    readonly suburb?: string
    readonly neighbourhood?: string
    readonly city?: string
    readonly town?: string
    readonly village?: string
    readonly municipality?: string
    readonly county?: string
    readonly state?: string
    readonly country?: string
  }
  readonly extratags?: {
    readonly cuisine?: string
    readonly website?: string
    readonly "contact:website"?: string
    readonly url?: string
  } | null
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

async function fetchNominatim(
  params: URLSearchParams,
  errorMessage: string,
): Promise<NominatimResult[]> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "Roastbook/1.0 (self-hosted coffee journal geocoding)",
      },
      signal: AbortSignal.timeout(15_000),
    },
  )

  if (!response.ok) {
    throw new Error(`${errorMessage}: ${response.status}`)
  }

  return response.json() as Promise<NominatimResult[]>
}

export const searchCoffeeShopCandidates = createServerFn({ method: "POST" })
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
      limit: String(NOMINATIM_CANDIDATE_LIMIT),
    })

    const payload = await fetchNominatim(params, "Geocoding request failed")

    return prioritizeCoffeeShopCandidates(payload, data.limit).flatMap((item) => {
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
          osmClass: item.category ?? item.class,
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

export const geocodeDefaultMapLocation = createServerFn({ method: "POST" })
  .validator((data: { query: string }) => ({ query: normalizeQuery(data.query) }))
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      q: data.query,
      format: "jsonv2",
      addressdetails: "1",
      limit: "1",
    })
    const payload = await fetchNominatim(params, "Location lookup failed")
    const result = payload[0]
    if (!result?.display_name || !result.lat || !result.lon) return null
    const latitude = Number(result.lat)
    const longitude = Number(result.lon)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
    return {
      latitude,
      longitude,
      label: result.display_name,
    }
  })
