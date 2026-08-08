import { afterEach, describe, expect, it, vi } from "vitest"
import { imageUrl, thumbnailUrl } from "./image-url"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("image URLs", () => {
  it("encodes nested storage paths into the upload endpoint query", () => {
    // Given
    const storagePath = "beans/162/label front.jpg"

    // When
    const url = imageUrl(storagePath)

    // Then
    expect(url).toBe("/api/uploads?path=beans%2F162%2Flabel+front.jpg")
  })

  it("requests the generated thumbnail with the original image as fallback", () => {
    // Given
    const storagePath = "gear/17/machine.webp"

    // When
    const url = thumbnailUrl(storagePath)

    // Then
    expect(url).toBe(
      "/api/uploads?path=gear%2F17%2Fmachine.thumb.webp&fallback=gear%2F17%2Fmachine.webp",
    )
  })

  it("keeps path-style URLs for a configured storage base", async () => {
    // Given
    vi.stubEnv("VITE_STORAGE_URL", "https://cdn.example/uploads")
    vi.resetModules()
    const configuredUrls = await import("./image-url")

    // When
    const url = configuredUrls.imageUrl("beans/162/label front.jpg")

    // Then
    expect(url).toBe("https://cdn.example/uploads/beans/162/label%20front.jpg")
  })
})
