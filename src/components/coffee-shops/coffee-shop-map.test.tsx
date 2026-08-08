// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CoffeeShopMap } from "./coffee-shop-map"

type MapMockState = {
  readonly events: Map<string, () => void>
  removed: boolean
  resizeCalls: number
}

const mapInstances = vi.hoisted<MapMockState[]>(() => [])
const resizeObserverCallbacks: ResizeObserverCallback[] = []
const resizeObserverDisconnects: Array<ReturnType<typeof vi.fn>> = []

vi.mock("maplibre-gl", () => ({
  LngLatBounds: class {
    extend() {
      return this
    }
    isEmpty() {
      return false
    }
  },
  Map: class {
    readonly state: MapMockState

    constructor() {
      this.state = { events: new Map(), removed: false, resizeCalls: 0 }
      mapInstances.push(this.state)
    }

    addControl() {}
    easeTo() {}
    fitBounds() {}
    on(event: string, callback: () => void) {
      this.state.events.set(event, callback)
    }
    remove() {
      this.state.removed = true
    }
    resize() {
      this.state.resizeCalls += 1
    }
  },
  Marker: class {
    addTo() {
      return this
    }
    remove() {}
    setLngLat() {
      return this
    }
    setPopup() {
      return this
    }
  },
  NavigationControl: class {},
  Popup: class {
    addTo() {
      return this
    }
    remove() {}
    setDOMContent() {
      return this
    }
    setLngLat() {
      return this
    }
  },
}))

async function renderMap(): Promise<{ readonly container: HTMLDivElement; readonly root: Root }> {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      <CoffeeShopMap
        coffeeShops={[{ id: 1, name: "Sweet Spot", latitude: 52.5, longitude: 13.4 }]}
      />,
    )
    await Promise.resolve()
    await Promise.resolve()
  })
  return { container, root }
}

function getMapEvent(index: number, event: string): () => void {
  const callback = mapInstances[index]?.events.get(event)
  if (!callback) throw new TypeError(`Expected map ${index} ${event} handler`)
  return callback
}

async function cleanupMap(container: HTMLDivElement, root: Root): Promise<void> {
  await act(async () => root.unmount())
  container.remove()
}

describe("CoffeeShopMap", () => {
  beforeEach(() => {
    mapInstances.length = 0
    resizeObserverCallbacks.length = 0
    resizeObserverDisconnects.length = 0
    vi.useRealTimers()
    vi.stubGlobal("ResizeObserver", class {
      readonly disconnect = vi.fn()

      constructor(callback: ResizeObserverCallback) {
        resizeObserverCallbacks.push(callback)
        resizeObserverDisconnects.push(this.disconnect)
      }

      observe() {}
      unobserve() {}
    })
  })

  it("resizes the map when its responsive container changes", async () => {
    // Given
    const { container, root } = await renderMap()
    const callback = resizeObserverCallbacks[0]
    if (!callback) throw new TypeError("Expected a map resize observer")

    // When
    callback([], {} as ResizeObserver)

    // Then
    expect(mapInstances[0]?.resizeCalls).toBe(1)

    await cleanupMap(container, root)
    expect(resizeObserverDisconnects[0]).toHaveBeenCalledOnce()
  })

  it("shows the unavailable fallback when loaded map tiles fail", async () => {
    // Given
    const { container, root } = await renderMap()

    // When
    await act(async () => getMapEvent(0, "error")())

    // Then
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Map unavailable",
    )

    await cleanupMap(container, root)
  })

  it("shows the unavailable fallback when map loading stalls", async () => {
    // Given
    vi.useFakeTimers()
    const { container, root } = await renderMap()

    // When
    await act(async () => vi.advanceTimersByTime(8_000))

    // Then
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Map unavailable",
    )

    await cleanupMap(container, root)
    vi.useRealTimers()
  })

  it("creates a fresh map and clears the fallback after retry succeeds", async () => {
    // Given
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    const { container, root } = await renderMap()
    await act(async () => getMapEvent(0, "error")())

    // When
    const retryButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Retry map",
    )
    expect(retryButton).toBeDefined()
    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => {
      getMapEvent(1, "idle")()
      await Promise.resolve()
      await Promise.resolve()
    })

    // Then
    expect(mapInstances).toHaveLength(2)
    expect(mapInstances[0]?.removed).toBe(true)
    expect(container.querySelector('[role="alert"]')).toBeNull()

    await cleanupMap(container, root)
    vi.unstubAllGlobals()
  })
})
