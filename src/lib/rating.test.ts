import { describe, expect, it } from "vitest"
import { toNullableRating, toRatingInput } from "./rating"

describe("nullable ratings", () => {
  it("preserves an unrated value through the edit form", () => {
    // Given
    const storedRating = null

    // When
    const inputRating = toRatingInput(storedRating)
    const submittedRating = toNullableRating(inputRating)

    // Then
    expect(submittedRating).toBeNull()
  })

  it("clears a selected rating when represented by zero", () => {
    // Given
    const inputRating = 0

    // When
    const submittedRating = toNullableRating(inputRating)

    // Then
    expect(submittedRating).toBeNull()
  })
})
