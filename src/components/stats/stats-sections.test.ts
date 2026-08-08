import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ChartStyle } from "@/components/ui/chart"
import { activityChartConfig } from "./stats-chart-config"

describe("activity chart styles", () => {
  it("emits the declared chart color as a usable CSS variable", () => {
    // Given
    const chartId = "activity-test"

    // When
    const markup = renderToStaticMarkup(
      createElement(ChartStyle, { id: chartId, config: activityChartConfig }),
    )

    // Then
    expect(markup).toContain("[data-chart=activity-test]")
    expect(markup).toContain("--color-count: var(--chart-1);")
  })
})
