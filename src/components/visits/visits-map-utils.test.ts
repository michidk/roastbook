import { describe, expect, it } from "vitest"
import {
  getMapMarkerVariant,
  getVisibleMapPlaces,
  toDiscoveredMapPlaces,
  toSavedMapPlaces,
} from "./visits-map-utils"

describe("visits map places", () => {
  it("keeps saved visit history on mappable coffee shops", () => {
    // Given
    const coffeeShops = [
      {
        id: 7,
        name: "Kaffeemitte",
        address: "Weinbergsweg 1",
        city: "Berlin",
        country: "Germany",
        latitude: "52.531",
        longitude: "13.401",
        website: null,
        rating: 5,
        isFavorite: true,
      },
    ]
    const visits = [
      { coffeeShopId: 7 },
      { coffeeShopId: 7 },
      { coffeeShopId: null },
    ]

    // When
    const places = toSavedMapPlaces(coffeeShops, visits)

    // Then
    expect(places).toEqual([
      expect.objectContaining({
        kind: "saved",
        id: "saved:7",
        visitCount: 2,
        rating: 5,
        isFavorite: true,
      }),
    ])
    expect(places[0] ? getMapMarkerVariant(places[0]) : null).toBe("favorite")
  })

  it("parses valid OpenStreetMap discoveries and ignores invalid coordinates", () => {
    // Given
    const candidates = [
      {
        id: 101,
        name: "Bonanza Coffee",
        displayName: "Bonanza Coffee, Berlin",
        latitude: "52.541",
        longitude: "13.412",
        openStreetMapUrl: "https://www.openstreetmap.org/node/101",
        city: "Berlin",
        country: "Germany",
      },
      {
        id: 102,
        name: "Broken pin",
        displayName: "Broken pin",
        latitude: "north",
        longitude: "13.4",
      },
    ]

    // When
    const places = toDiscoveredMapPlaces(candidates)

    // Then
    expect(places).toHaveLength(1)
    expect(places[0]).toEqual(
      expect.objectContaining({
        kind: "discovered",
        id: "discovered:101",
        name: "Bonanza Coffee",
      }),
    )
  })

  it("does not show an OpenStreetMap result that is already saved", () => {
    // Given
    const saved = toSavedMapPlaces(
      [
        {
          id: 7,
          name: "Kaffeemitte",
          address: null,
          city: "Berlin",
          country: "Germany",
          latitude: "52.5310000",
          longitude: "13.4010000",
          website: null,
          rating: null,
          isFavorite: false,
        },
      ],
      [],
    )
    const discovered = toDiscoveredMapPlaces([
      {
        id: 101,
        name: "Kaffeemitte",
        displayName: "Kaffeemitte, Berlin",
        latitude: "52.53102",
        longitude: "13.40102",
      },
      {
        id: 102,
        name: "Five Elephant",
        displayName: "Five Elephant, Berlin",
        latitude: "52.499",
        longitude: "13.421",
      },
    ])

    // When
    const places = getVisibleMapPlaces(saved, discovered)

    // Then
    expect(places.map((place) => place.name)).toEqual([
      "Kaffeemitte",
      "Five Elephant",
    ])
  })
})
