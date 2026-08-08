import { describe, expect, it } from "vitest"
import { fillDailyActivity } from "./stats-activity"

describe("fillDailyActivity", () => {
  it("fills missing dates in the 30-day activity window", () => {
    // Given
    const today = new Date(2026, 7, 5, 12)
    const activity = [
      { date: "2026-08-03", count: 2 },
      { date: "2026-08-05", count: 1 },
    ]

    // When
    const result = fillDailyActivity(activity, today)

    // Then
    expect(result).toHaveLength(30)
    expect(result[0]).toEqual({ date: "2026-07-07", count: 0 })
    expect(result.at(-3)).toEqual({ date: "2026-08-03", count: 2 })
    expect(result.at(-1)).toEqual({ date: "2026-08-05", count: 1 })
  })
})
