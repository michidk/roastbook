import { describe, expect, it } from "vitest"
import { normalizeRatingAverages, toNullableNumber } from "./stats-number"

describe("statistics number normalization", () => {
  it("normalizes PostgreSQL numeric strings and nullable aggregates", () => {
    // Given
    const numericAverage = "16.2"
    const absentAverage = null

    // When
    const average = toNullableNumber(numericAverage)
    const absent = toNullableNumber(absentAverage)

    // Then
    expect(average).toBe(16.2)
    expect(absent).toBeNull()
  })

  it("normalizes every rating average in a result set", () => {
    // Given
    const rows = [
      { beanId: 1, avgRating: "4.25" },
      { beanId: 2, avgRating: null },
    ]

    // When
    const normalized = normalizeRatingAverages(rows)

    // Then
    expect(normalized).toEqual([
      { beanId: 1, avgRating: 4.25 },
      { beanId: 2, avgRating: null },
    ])
  })
})
