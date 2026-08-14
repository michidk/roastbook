import type { ComponentProps } from 'react'
import { FormSection } from '@/components/form/form-shell'
import { PictureUploadDialog } from '@/components/picture-upload-dialog'
import type { useImageUpload } from '@/hooks/useImageUpload'

type ImageUploadDisplayProps = Pick<
  ComponentProps<typeof PictureUploadDialog>,
  | 'footer'
  | 'helperText'
  | 'isBusy'
  | 'previewAltPrefix'
  | 'prompt'
  | 'statusText'
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
      <PictureUploadDialog
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
