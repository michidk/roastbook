import { describe, expect, it } from "vitest"
import { parseNearbyCoffeeShops } from "./nearby-coffee-shops"

describe("parseNearbyCoffeeShops", () => {
  it("maps named café nodes and way centers into discovery candidates", () => {
    // Given
    const payload = {
      elements: [
        {
          type: "node",
          id: 42,
          lat: 48.13,
          lon: 11.57,
          tags: {
            name: "Daily Roast",
            amenity: "cafe",
            "addr:street": "Bean Street",
            "addr:housenumber": "7",
            "addr:city": "München",
            website: "https://daily.example",
          },
        },
        {
          type: "way",
          id: 84,
          center: { lat: 48.14, lon: 11.58 },
          tags: {
            name: "Corner Coffee",
            shop: "coffee",
          },
        },
      ],
    }

    // When
    const places = parseNearbyCoffeeShops(payload)

    // Then
    expect(places).toEqual([
      expect.objectContaining({
        id: "node:42",
        name: "Daily Roast",
        address: "Bean Street 7",
        city: "München",
        website: "https://daily.example",
        openStreetMapUrl: "https://www.openstreetmap.org/node/42",
      }),
      expect.objectContaining({
        id: "way:84",
        name: "Corner Coffee",
        latitude: "48.14",
        longitude: "11.58",
      }),
    ])
  })

  it("ignores unnamed and malformed Overpass elements", () => {
    // Given
    const payload = {
      elements: [
        { type: "node", id: 1, lat: 48.1, lon: 11.5, tags: { amenity: "cafe" } },
        { type: "node", id: 2, lat: "north", lon: 11.5, tags: { name: "Bad pin" } },
        null,
      ],
    }

    // When
    const places = parseNearbyCoffeeShops(payload)

    // Then
    expect(places).toEqual([])
  })
})
