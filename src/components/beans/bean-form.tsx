import { Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BeanFields } from '@/components/beans/bean-fields'
import {
  beanCreatePayload,
  createEmptyBeanFormValues,
} from '@/components/beans/bean-form-values'
import {
  EntityImageUploadRecovery,
  EntityImageUploadSection,
} from '@/components/form/entity-image-upload-section'
import { EntityForm } from '@/components/form/form-shell'
import {
  ExtractedRoasterDialog,
  roasterDetailsFromExtraction,
} from '@/components/roasters/extracted-roaster-dialog'
import type { RoasterFormValues } from '@/components/roasters/roaster-form-values'
import type { RoasterOption } from '@/components/roasters/roaster-picker'
import { Button } from '@/components/ui/button'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useFormState } from '@/hooks/use-form-state'
import { useFormSubmission } from '@/hooks/use-form-submission'
import type { ImageFile } from '@/hooks/useImageUpload'
import { useImageUpload } from '@/hooks/useImageUpload'
import { getErrorMessage } from '@/lib/error-message'
import { findRoasterByName } from '@/lib/roaster-match'
import {
  checkVisionEnabled,
  createBean,
  extractBeanInfo,
} from '@/lib/server/beans'
import { getRoasters } from '@/lib/server/roasters'
import {
  type EntityImageUploadFailure,
  uploadEntityImages,
} from '@/lib/upload-entity-images'

type CreatedBean = Awaited<ReturnType<typeof createBean>>

interface BeanFormProps {
  onCreated: (bean: CreatedBean) => void | Promise<void>
  onCancel: () => void
  initialName?: string
  submitLabel?: string
  roasters?: readonly RoasterOption[]
}

export function BeanForm({
  onCreated,
  onCancel,
  initialName = '',
  submitLabel = 'Add beans',
  roasters,
}: BeanFormProps) {
  const { defaultCurrency } = useAppSettings()
  const [isExtracting, setIsExtracting] = useState(false)
  const [visionEnabled, setVisionEnabled] = useState(false)
  const [loadedRoasters, setLoadedRoasters] = useState<
    readonly RoasterOption[]
  >([])
  const [createdRoasters, setCreatedRoasters] = useState<
    readonly RoasterOption[]
  >([])
  const [extractedRoasterName, setExtractedRoasterName] = useState<
    string | null
  >(null)
  const [extractedRoasterDetails, setExtractedRoasterDetails] = useState<
    Partial<RoasterFormValues>
  >({})
  const [createdBean, setCreatedBean] = useState<CreatedBean | null>(null)
  const [uploadFailures, setUploadFailures] = useState<
    readonly EntityImageUploadFailure[]
  >([])
  const [isRetryingPictures, setIsRetryingPictures] = useState(false)
  const imageUpload = useImageUpload()
  const { images } = imageUpload

  const form = useFormState(createEmptyBeanFormValues(initialName))

  useEffect(() => {
    form.set('priceCurrency', defaultCurrency)
  }, [defaultCurrency, form.set])

  useEffect(() => {
    let active = true
    void checkVisionEnabled()
      .then((result) => {
        if (active) setVisionEnabled(result.enabled)
      })
      .catch(() => {
        if (active) setVisionEnabled(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (roasters) return
    let active = true
    void getRoasters()
      .then((result) => {
        if (active) setLoadedRoasters(result)
      })
      .catch((error) => {
        if (active) {
          toast.error(getErrorMessage(error, 'Could not load roasters'))
        }
      })
    return () => {
      active = false
    }
  }, [roasters])

  const baseRoasters = roasters ?? loadedRoasters
  const roasterOptions = [
    ...baseRoasters,
    ...createdRoasters.filter(
      (created) => !baseRoasters.some((roaster) => roaster.id === created.id),
    ),
  ]

  const handleFillWithAI = async () => {
    if (images.length === 0) return

    setIsExtracting(true)
    try {
      const firstImage = images[0]
      if (!firstImage) return
      const extracted = await extractBeanInfo({
        data: {
          imageBase64: firstImage.base64,
          mimeType: firstImage.file.type,
        },
      })

      const extractedRoaster = extracted.roaster
      const matchedRoaster = extractedRoaster
        ? findRoasterByName(roasterOptions, extractedRoaster)
        : undefined

      form.setValues((current) => ({
        ...current,
        name: extracted.name || current.name,
        type: extracted.type || current.type,
        roasterId: current.roasterId,
        origin: extracted.origin || current.origin,
        region: extracted.region || current.region,
        farm: extracted.farm || current.farm,
        variety: extracted.variety || current.variety,
        process: extracted.process || current.process,
        roastLevel: extracted.roastLevel || current.roastLevel,
        roastDate: extracted.roastDate || current.roastDate,
        notes: extracted.notes || current.notes,
      }))
      if (
        extractedRoaster &&
        String(matchedRoaster?.id ?? '') !== form.values.roasterId
      ) {
        setExtractedRoasterDetails(roasterDetailsFromExtraction(extracted))
        setExtractedRoasterName(extractedRoaster)
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to extract bean info'))
    } finally {
      setIsExtracting(false)
    }
  }

  const { isSubmitting, handleSubmit } = useFormSubmission({
    canSubmit: () => Boolean(form.values.name.trim()),
    submit: async () => {
      const bean = await createBean({
        data: beanCreatePayload(form.values),
      })

      const uploadResult = await uploadEntityImages('beans', bean.id, images)
      imageUpload.removeImages(uploadResult.uploaded)
      if (uploadResult.failures.length > 0) {
        setCreatedBean(bean)
        setUploadFailures(uploadResult.failures)
        return
      }
      await onCreated(bean)
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not save these beans')),
  })

  const retryPictures = async (pictures: readonly ImageFile[]) => {
    if (!createdBean) return
    setIsRetryingPictures(true)
    try {
      const result = await uploadEntityImages('beans', createdBean.id, pictures)
      imageUpload.removeImages(result.uploaded)
      setUploadFailures(result.failures)
      if (result.failures.length === 0) await onCreated(createdBean)
    } finally {
      setIsRetryingPictures(false)
    }
  }

  const removeFailedPicture = (index: number) => {
    const image = imageUpload.images[index]
    if (image) {
      setUploadFailures((current) =>
        current.filter((failure) => failure.image.preview !== image.preview),
      )
    }
    imageUpload.removeImage(index)
  }

  if (createdBean) {
    return (
      <EntityImageUploadRecovery
        upload={imageUpload}
        title="Beans saved"
        description="The entry is safe, but one or more pictures could not be uploaded. Try again, remove them, or continue without them."
        continueLabel="View beans"
        previewAltPrefix="Bean"
        isBusy={isRetryingPictures}
        statusText={isRetryingPictures ? 'Retrying pictures' : undefined}
        imageErrors={uploadFailures.map(({ image, error }) => ({
          preview: image.preview,
          filename: image.file.name,
          message: getErrorMessage(error, 'The server rejected this picture'),
        }))}
        onRetryImages={retryPictures}
        onRemoveImage={removeFailedPicture}
        onContinue={() => onCreated(createdBean)}
      />
    )
  }

  return (
    <>
      <EntityForm
        onSubmit={handleSubmit}
        actions={{
          onCancel,
          isSubmitting,
          disabled: !form.values.name.trim(),
          submitLabel,
        }}
      >
        <EntityImageUploadSection
          upload={imageUpload}
          prompt="Add pictures of the coffee bag"
          previewAltPrefix="Bean"
          isBusy={isSubmitting}
          statusText={isSubmitting ? 'Saving bean pictures' : undefined}
          helperText={
            visionEnabled
              ? 'AI can extract bean info from your pictures'
              : undefined
          }
          footer={
            visionEnabled ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleFillWithAI}
                disabled={isExtracting || images.length === 0}
              >
                {isExtracting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Extract details with AI
              </Button>
            ) : undefined
          }
        />

        <BeanFields
          values={form.values}
          onChange={form.set}
          roasters={roasterOptions}
        />
      </EntityForm>
      {extractedRoasterName ? (
        <ExtractedRoasterDialog
          open
          suggestedName={extractedRoasterName}
          suggestedDetails={extractedRoasterDetails}
          currentRoasterId={form.values.roasterId}
          roasters={roasterOptions}
          onOpenChange={(open) => {
            if (!open) setExtractedRoasterName(null)
          }}
          onSelect={(roaster) => form.set('roasterId', String(roaster.id))}
          onCreated={(roaster) => {
            setCreatedRoasters((current) => [...current, roaster])
            form.set('roasterId', String(roaster.id))
            setExtractedRoasterName(null)
          }}
        />
      ) : null}
    </>
  )
}
