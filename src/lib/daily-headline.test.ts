import { describe, expect, it } from "vitest"
import { getDailyHeadline } from "./daily-headline"

describe("daily dashboard headline", () => {
  it("stays stable throughout a local calendar day", () => {
    // Given
    const morning = new Date(2026, 7, 9, 0, 1)
    const evening = new Date(2026, 7, 9, 23, 59)

    // When
    const morningHeadline = getDailyHeadline(morning)
    const eveningHeadline = getDailyHeadline(evening)

    // Then
    expect(eveningHeadline).toBe(morningHeadline)
  })

  it("changes on the next local calendar day", () => {
    // Given
    const today = new Date(2026, 7, 9, 12)
    const tomorrow = new Date(2026, 7, 10, 12)

    // When
    const todayHeadline = getDailyHeadline(today)
    const tomorrowHeadline = getDailyHeadline(tomorrow)

    // Then
    expect(tomorrowHeadline).not.toBe(todayHeadline)
  })
})
