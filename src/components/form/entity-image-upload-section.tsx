import { Button } from '@roastbook/ui/button'
import type { ComponentProps } from 'react'
import { BeautifyImageToggle } from '@/components/beautify-image-toggle'
import { FormSection } from '@/components/form/form-shell'
import { PictureUploader } from '@/components/picture-uploader'
import type { useImageUpload } from '@/hooks/use-image-upload'

type ImageUploadDisplayProps = Pick<
  ComponentProps<typeof PictureUploader>,
  | 'footer'
  | 'helperText'
  | 'imageErrors'
  | 'isBusy'
  | 'onRetryImages'
  | 'previewAltPrefix'
  | 'prompt'
  | 'showIntake'
  | 'statusText'
>

type EntityImageUploadSectionProps = ImageUploadDisplayProps & {
  readonly upload: ReturnType<typeof useImageUpload>
  readonly onRemoveImage?: (index: number) => void
}

export function EntityImageUploadSection({
  upload,
  onRemoveImage,
  ...displayProps
}: EntityImageUploadSectionProps) {
  return (
    <FormSection title="Pictures">
      <PictureUploader
        maxImages={upload.maxImages}
        images={upload.images}
        fileInputRef={upload.fileInputRef}
        onFilesAdded={upload.addFiles}
        onImportFromUrl={upload.importFromUrl}
        onRemoveImage={onRemoveImage ?? upload.removeImage}
        onMakePrimary={upload.makePrimary}
        onOpenFilePicker={upload.openFilePicker}
        {...displayProps}
      />
      <BeautifyImageToggle disabled={displayProps.isBusy} />
    </FormSection>
  )
}

interface EntityImageUploadRecoveryProps
  extends Pick<
    ComponentProps<typeof PictureUploader>,
    | 'imageErrors'
    | 'isBusy'
    | 'onRetryImages'
    | 'previewAltPrefix'
    | 'statusText'
  > {
  readonly upload: ReturnType<typeof useImageUpload>
  readonly title: string
  readonly description: string
  readonly continueLabel: string
  readonly onContinue: () => void | Promise<void>
  readonly onRemoveImage: (index: number) => void
}

export function EntityImageUploadRecovery({
  upload,
  title,
  description,
  continueLabel,
  onContinue,
  onRemoveImage,
  isBusy = false,
  ...displayProps
}: EntityImageUploadRecoveryProps) {
  return (
    <div className="space-y-4">
      <FormSection title={title} description={description}>
        <PictureUploader
          maxImages={upload.maxImages}
          images={upload.images}
          fileInputRef={upload.fileInputRef}
          onFilesAdded={upload.addFiles}
          onImportFromUrl={upload.importFromUrl}
          onRemoveImage={onRemoveImage}
          onOpenFilePicker={upload.openFilePicker}
          prompt="Add pictures"
          showIntake={false}
          isBusy={isBusy}
          {...displayProps}
        />
      </FormSection>
      <div className="flex justify-end">
        <Button
          type="button"
          disabled={isBusy}
          onClick={() => void onContinue()}
        >
          {continueLabel}
        </Button>
      </div>
    </div>
  )
}
