import { describe, expect, it } from "vitest"
import {
  getCafeVisitUpdateErrors,
  getShotUpdateErrors,
} from "./update-validation"

describe("update input validation", () => {
  it("rejects shot decimals that exceed database precision", () => {
    // Given
    const input = { id: 1, doseGrams: "18.999", pressure: "100.0" }

    // When
    const errors = getShotUpdateErrors(input)

    // Then
    expect(errors).toEqual({
      doseGrams: "Dose must have at most 2 decimal places",
      pressure: "Pressure must be between 0 and 99.9",
    })
  })

  it("rejects invalid ratings and visit prices", () => {
    // Given
    const input = { id: 1, price: "-1", currency: "BTC", rating: 6 }

    // When
    const errors = getCafeVisitUpdateErrors(input)

    // Then
    expect(errors).toEqual({
      price: "Price must be between 0 and 9999.99",
      currency: "Choose a supported currency",
      rating: "Rating must be between 1 and 5",
    })
  })

  it("accepts cleared nullable fields", () => {
    // Given
    const shot = { id: 1, doseGrams: null, rating: null }
    const visit = { id: 1, price: undefined, rating: null }

    // When
    const shotErrors = getShotUpdateErrors(shot)
    const visitErrors = getCafeVisitUpdateErrors(visit)

    // Then
    expect(shotErrors).toEqual({})
    expect(visitErrors).toEqual({})
  })
})
