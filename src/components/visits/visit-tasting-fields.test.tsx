// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { describe, expect, it, vi } from "vitest"
import { TasteTagGroup } from "./visit-tasting-fields"

describe("TasteTagGroup", () => {
  it("renders selectable tags as named pressed-state buttons", async () => {
    // Given
    const onToggleTag = vi.fn()
    const container = document.createElement("div")
    document.body.append(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <TasteTagGroup
          id="test-positives-label"
          label="Positives"
          labelClassName="text-primary"
          tags={[
            { id: 1, name: "Sweet" },
            { id: 2, name: "Balanced" },
          ]}
          selectedTagIds={[1]}
          selectedVariant="default"
          hoverClassName="hover:bg-primary/10"
          onToggleTag={onToggleTag}
        />
      )
    })

    const group = container.querySelector('[role="group"]')
    const buttons = group?.querySelectorAll<HTMLButtonElement>('button[type="button"]')

    // When
    await act(async () => buttons?.item(1).click())

    // Then
    expect(group?.getAttribute("aria-labelledby")).toBe("test-positives-label")
    expect(buttons).toHaveLength(2)
    expect(buttons?.item(0).getAttribute("aria-pressed")).toBe("true")
    expect(buttons?.item(1).getAttribute("aria-pressed")).toBe("false")
    expect(onToggleTag).toHaveBeenCalledWith(2)

    await act(async () => root.unmount())
    container.remove()
  })
})
