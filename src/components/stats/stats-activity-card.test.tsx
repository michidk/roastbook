// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { formatActivityDate, StatsActivityCard } from "./stats-activity-card"

describe("statistics activity", () => {
  it("renders the explicit empty state", () => {
    // Given
    const activity = [{ date: "2026-08-05", count: 0 }]

    // When
    const markup = renderToStaticMarkup(<StatsActivityCard activity={activity} />)

    // Then
    expect(markup).toContain("No recent shots")
    expect(markup).toContain("Activity will appear here after the next logged shot.")
  })

  it("does not seed a desktop-width chart on narrow screens", () => {
    // Given
    const activity = [{ date: "2026-08-05", count: 1 }]

    // When
    const markup = renderToStaticMarkup(<StatsActivityCard activity={activity} />)

    // Then
    expect(markup).not.toContain("width:500px")
  })

  it("keeps date-only labels on their stored calendar day", () => {
    // Given
    const previousTimezone = process.env.TZ
    process.env.TZ = "America/Los_Angeles"

    // When
    const label = formatActivityDate("2026-08-05")
    process.env.TZ = previousTimezone

    // Then
    expect(label).toContain("Aug 5")
  })
})
