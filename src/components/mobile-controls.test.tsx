// @vitest-environment jsdom

import { createRef } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ImageUploadField } from "@/components/image-upload-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StarRating } from "@/components/ui/star-rating"

describe("mobile controls", () => {
  it("gives primary controls a 44px mobile target", () => {
    // Given
    const controls = (
      <>
        <Button>Save</Button>
        <Input aria-label="Name" />
        <StarRating value={3} onChange={() => {}} />
      </>
    )

    // When
    const markup = renderToStaticMarkup(controls)

    // Then
    expect(markup).toContain("h-11")
    expect(markup).toContain("size-11")
  })

  it("keeps image removal visible and touch-sized without hover", () => {
    // Given
    const image = {
      file: new File(["image"], "coffee.png", { type: "image/png" }),
      preview: "blob:coffee",
      base64: "aW1hZ2U=",
    }

    // When
    const markup = renderToStaticMarkup(
      <ImageUploadField
        images={[image]}
        fileInputRef={createRef<HTMLInputElement>()}
        onFilesAdded={async () => [image]}
        onImportFromUrl={async () => image}
        onPasteFromClipboard={async () => [image]}
        onRemoveImage={() => {}}
        onOpenFilePicker={() => {}}
        prompt="Add images"
        previewAltPrefix="Bean"
      />,
    )

    // Then
    expect(markup).toContain("opacity-100")
    expect(markup).toContain("size-11")
  })

  it("exposes the image picker as a keyboard-operable button", () => {
    // Given
    const field = (
      <ImageUploadField
        images={[]}
        fileInputRef={createRef<HTMLInputElement>()}
        onFilesAdded={async () => []}
        onImportFromUrl={async () => ({
          file: new File(["image"], "coffee.png", { type: "image/png" }),
          preview: "blob:coffee",
          base64: "aW1hZ2U=",
        })}
        onPasteFromClipboard={async () => []}
        onRemoveImage={() => {}}
        onOpenFilePicker={() => {}}
        prompt="Add images"
        previewAltPrefix="Bean"
      />
    )

    // When
    const markup = renderToStaticMarkup(field)

    // Then
    expect(markup).toContain('<button type="button"')
  })
})
