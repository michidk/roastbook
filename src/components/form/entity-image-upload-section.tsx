import type { ComponentProps } from "react"
import { ImageUploadField } from "@/components/image-upload-field"
import { FormSection } from "@/components/form/form-shell"
import type { useImageUpload } from "@/hooks/useImageUpload"

type ImageUploadDisplayProps = Pick<
  ComponentProps<typeof ImageUploadField>,
  | "footer"
  | "helperText"
  | "isBusy"
  | "previewAltPrefix"
  | "prompt"
  | "statusText"
>

type EntityImageUploadSectionProps = ImageUploadDisplayProps & {
  readonly upload: ReturnType<typeof useImageUpload>
}

export function EntityImageUploadSection({
  upload,
  ...displayProps
}: EntityImageUploadSectionProps) {
  return (
    <FormSection title="Pictures">
      <ImageUploadField
        images={upload.images}
        fileInputRef={upload.fileInputRef}
        onFilesAdded={upload.addFiles}
        onImportFromUrl={upload.importFromUrl}
        onPasteFromClipboard={upload.pasteFromClipboard}
        onRemoveImage={upload.removeImage}
        onOpenFilePicker={upload.openFilePicker}
        {...displayProps}
      />
    </FormSection>
  )
}
