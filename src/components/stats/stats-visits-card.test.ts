import { describe, expect, it } from "vitest"
import { getPlacesRankingState } from "./stats-visits-card"

describe("visit place ranking state", () => {
  it("uses the no-visits state when nothing has been logged", () => {
    // Given
    const totalVisits = 0

    // When
    const state = getPlacesRankingState(totalVisits, 0)

    // Then
    expect(state).toBe("no-visits")
  })

  it("uses the unlinked-visits state when visits have no saved place", () => {
    // Given
    const totalVisits = 2

    // When
    const state = getPlacesRankingState(totalVisits, 0)

    // Then
    expect(state).toBe("unlinked-visits")
  })

  it("uses the ranked state when a linked place exists", () => {
    // Given
    const totalVisits = 2

    // When
    const state = getPlacesRankingState(totalVisits, 1)

    // Then
    expect(state).toBe("ranked")
  })
})
