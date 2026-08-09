// @vitest-environment jsdom

import { act } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { ResilientImage } from "./resilient-image"

describe("ResilientImage", () => {
  it("keeps a decorative fallback hidden from assistive technology", () => {
    // Given
    const element = <ResilientImage alt="" width={48} height={48} />

    // When
    const markup = renderToString(element)

    // Then
    expect(markup).not.toContain('role="img"')
    expect(markup).not.toContain("Image unavailable")
  })

  it("shows the fallback when an image failed before hydration", async () => {
    // Given
    const container = document.createElement("div")
    const element = (
      <ResilientImage
        src="/missing.webp"
        alt="Missing coffee bag"
        width={320}
        height={200}
      />
    )
    container.innerHTML = renderToString(element)
    document.body.append(container)

    const image = container.querySelector("img")
    Object.defineProperties(image, {
      complete: { configurable: true, value: true },
      naturalWidth: { configurable: true, value: 0 },
    })

    // When
    const root = hydrateRoot(container, element)
    await act(async () => undefined)

    // Then
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector("svg.lucide-image-off")).not.toBeNull()
    expect(container.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe(
      "Missing coffee bag. Image unavailable",
    )
    expect(container.querySelector('[role="img"]')?.getAttribute("style")).toContain(
      "aspect-ratio: 320 / 200",
    )

    await act(async () => root.unmount())
    container.remove()
  })

  it("defers a lazy upload fetch until the image intersects", async () => {
    // Given
    const firstSource = "/api/uploads?path=beans%2F1%2Fbag.jpg"
    const secondSource = "/api/uploads?path=beans%2F2%2Fbag.jpg"
    const fetchImage = vi.fn(async () => new Response("image", {
      status: 200,
      headers: { "Content-Type": "image/jpeg" },
    }))
    const observerCallbacks: IntersectionObserverCallback[] = []
    const observers: IntersectionObserver[] = []
    class TestIntersectionObserver implements IntersectionObserver {
      readonly root = null
      readonly rootMargin = "300px"
      readonly scrollMargin = "0px"
      readonly thresholds = [0]

      constructor(callback: IntersectionObserverCallback) {
        observerCallbacks.push(callback)
        observers.push(this)
      }

      disconnect() {}
      observe() {}
      takeRecords() {
        return []
      }
      unobserve() {}
    }
    vi.stubGlobal("fetch", fetchImage)
    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver)
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    vi.spyOn(URL, "createObjectURL").mockImplementation(
      () => `blob:loaded-image-${fetchImage.mock.calls.length}`,
    )
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)

    const container = document.createElement("div")
    const firstElement = (
      <ResilientImage
        src={firstSource}
        alt="Coffee bag"
        loading="lazy"
        width={320}
        height={200}
      />
    )
    container.innerHTML = renderToString(firstElement)
    document.body.append(container)

    // When
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, firstElement)
      await Promise.resolve()
    })
    expect(fetchImage).not.toHaveBeenCalled()

    expect(observerCallbacks).toHaveLength(1)
    expect(observers).toHaveLength(1)
    const firstCallback = observerCallbacks[0]
    const firstObserver = observers[0]
    const observedElement = container.firstElementChild
    expect(observedElement).not.toBeNull()
    if (!observedElement || !firstCallback || !firstObserver) {
      throw new TypeError("Expected the first lazy image observer")
    }

    await act(async () => {
      firstCallback(
        [{
          boundingClientRect: observedElement.getBoundingClientRect(),
          intersectionRatio: 1,
          intersectionRect: observedElement.getBoundingClientRect(),
          isIntersecting: true,
          rootBounds: null,
          target: observedElement,
          time: 0,
        }],
        firstObserver,
      )
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    // Then
    expect(fetchImage).toHaveBeenCalledTimes(1)
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "blob:loaded-image-1",
    )

    await act(async () => {
      root?.render(
        <ResilientImage
          src={secondSource}
          alt="Second coffee bag"
          loading="lazy"
          width={320}
          height={200}
        />,
      )
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(observerCallbacks).toHaveLength(2)
    expect(fetchImage).toHaveBeenCalledTimes(1)
    const secondCallback = observerCallbacks[1]
    const secondObserver = observers[1]
    const secondPlaceholder = container.firstElementChild
    if (!secondPlaceholder || !secondCallback || !secondObserver) {
      throw new TypeError("Expected the replacement lazy image observer")
    }

    await act(async () => {
      secondCallback(
        [{
          boundingClientRect: secondPlaceholder.getBoundingClientRect(),
          intersectionRatio: 1,
          intersectionRect: secondPlaceholder.getBoundingClientRect(),
          isIntersecting: true,
          rootBounds: null,
          target: secondPlaceholder,
          time: 0,
        }],
        secondObserver,
      )
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchImage).toHaveBeenCalledTimes(2)
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "blob:loaded-image-2",
    )

    await act(async () => root?.unmount())
    container.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
})
