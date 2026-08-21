import { describe, expect, it } from "vitest"
import { prioritizeCoffeeShopCandidates } from "./geocoding-ranking"

describe("OpenStreetMap coffee shop ranking", () => {
  it("prioritizes coffee-specific places before generic matches", () => {
    // Given
    const results = [
      {
        id: 1,
        category: "natural",
        type: "cliff",
      },
      {
        id: 2,
        category: "amenity",
        type: "cafe",
      },
      {
        id: 3,
        category: "shop",
        type: "coffee",
      },
      {
        id: 4,
        category: "amenity",
        type: "cafe",
        extratags: { cuisine: "cake;coffee_shop" },
      },
    ] as const

    // When
    const prioritized = prioritizeCoffeeShopCandidates(results, 3)

    // Then
    expect(prioritized.map((result) => result.id)).toEqual([4, 3, 2])
  })

  it("preserves Nominatim order among equally ranked fallback results", () => {
    // Given
    const results = [
      { id: 10, category: "place", type: "locality" },
      { id: 11, category: "place", type: "island" },
    ] as const

    // When
    const prioritized = prioritizeCoffeeShopCandidates(results, 5)

    // Then
    expect(prioritized.map((result) => result.id)).toEqual([10, 11])
  })
})
