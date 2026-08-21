// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { describe, expect, it, vi } from "vitest"
import { ShotsViewToggle, groupShotsByBean } from "./shots-overview"

describe("ShotsViewToggle", () => {
  it("requests bean grouping when the ungrouped toggle is pressed", async () => {
    // Given
    const onGroupedChange = vi.fn()
    const container = document.createElement("div")
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<ShotsViewToggle grouped={false} onGroupedChange={onGroupedChange} />)
    })

    const button = container.querySelector<HTMLButtonElement>('button[type="button"]')

    // When
    await act(async () => button?.click())

    // Then
    expect(button?.getAttribute("aria-pressed")).toBe("false")
    expect(onGroupedChange).toHaveBeenCalledWith(true)

    await act(async () => root.unmount())
    container.remove()
  })
})

describe("groupShotsByBean", () => {
  it("sorts groups by their latest shot and collects shots without a bean", () => {
    // Given
    const shots = [
      { id: 1, createdAt: new Date("2026-06-01"), bean: { id: 10, name: "Halo" } },
      { id: 2, createdAt: new Date("2026-08-01"), bean: { id: 20, name: "Luna" } },
      { id: 3, createdAt: new Date("2026-07-01"), bean: { id: 10, name: "Halo" } },
      { id: 4, createdAt: new Date("2026-07-15"), bean: null },
    ]

    // When
    const groups = groupShotsByBean(shots)

    // Then
    expect(groups.map((group) => group.label)).toEqual([
      "Luna",
      "No bean recorded",
      "Halo",
    ])
    expect(groups.map((group) => group.shots.map((shot) => shot.id))).toEqual([
      [2],
      [4],
      [1, 3],
    ])
  })
})
