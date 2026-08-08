// @vitest-environment jsdom

import { act } from "react"
import { createPortal } from "react-dom"
import { createRoot } from "react-dom/client"
import { describe, expect, it, vi } from "vitest"
import { EntityForm } from "./form-shell"

describe("EntityForm", () => {
  it("does not submit an ancestor form when a portalled nested form submits", async () => {
    // Given a page form containing a portalled dialog form, mirroring how an
    // inline "create entity" modal renders inside a page form. React bubbles
    // events through the React tree even though the portal escapes the DOM.
    const onOuterSubmit = vi.fn()
    const onInnerSubmit = vi.fn()

    const container = document.createElement("div")
    const portalTarget = document.createElement("div")
    document.body.append(container, portalTarget)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <EntityForm onSubmit={onOuterSubmit}>
          <button type="submit" data-testid="outer-submit">
            Save page
          </button>
          {createPortal(
            <EntityForm onSubmit={onInnerSubmit}>
              <button type="submit" data-testid="inner-submit">
                Save dialog
              </button>
            </EntityForm>,
            portalTarget
          )}
        </EntityForm>
      )
    })

    // When the dialog's own submit button is pressed
    const innerSubmit = portalTarget.querySelector<HTMLButtonElement>(
      '[data-testid="inner-submit"]'
    )
    await act(async () => innerSubmit?.click())

    // Then only the dialog form handles it
    expect(onInnerSubmit).toHaveBeenCalledTimes(1)
    expect(onOuterSubmit).not.toHaveBeenCalled()

    // And the page form still submits on its own
    const outerSubmit = container.querySelector<HTMLButtonElement>(
      '[data-testid="outer-submit"]'
    )
    await act(async () => outerSubmit?.click())
    expect(onOuterSubmit).toHaveBeenCalledTimes(1)

    await act(async () => root.unmount())
    container.remove()
    portalTarget.remove()
  })
})
