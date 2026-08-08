import { describe, expect, it } from "vitest"
import { getOpenStreetMapUrl, parseCoordinate } from "./coffee-shop-map-utils"

describe("coffee shop map utilities", () => {
  it("parses finite coordinates and rejects empty values", () => {
    // Given
    const latitude = "52.5267"

    // When
    const parsedLatitude = parseCoordinate(latitude)

    // Then
    expect(parsedLatitude).toBe(52.5267)
    expect(parseCoordinate("")).toBeNull()
  })

  it("rejects coordinates outside geographic bounds", () => {
    // Given
    const invalidLatitude = 91
    const invalidLongitude = -181

    // When
    const latitude = parseCoordinate(invalidLatitude, "latitude")
    const longitude = parseCoordinate(invalidLongitude, "longitude")

    // Then
    expect(latitude).toBeNull()
    expect(longitude).toBeNull()
  })

  it("builds an external map URL from coordinates", () => {
    // Given
    const coffeeShop = { latitude: 52.5267, longitude: 13.39 }

    // When
    const url = getOpenStreetMapUrl(coffeeShop)

    // Then
    expect(url).toBe(
      "https://www.openstreetmap.org/?mlat=52.5267&mlon=13.39#map=18/52.5267/13.39",
    )
  })
})
