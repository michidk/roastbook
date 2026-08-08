import { describe, expect, it } from "vitest"
import { formatMeasurement } from "./stats-format"

describe("statistics formatting", () => {
  it("labels absent averages instead of stringifying null", () => {
    // Given
    const average = null

    // When
    const label = formatMeasurement(average, "g")

    // Then
    expect(label).toBe("Not enough data")
  })
})
