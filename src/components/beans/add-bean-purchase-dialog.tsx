import { Loader2, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DateField } from '@/components/form/date-field'
import {
  EntityImageUploadRecovery,
  EntityImageUploadSection,
} from '@/components/form/entity-image-upload-section'
import {
  CurrencyField,
  CurrencyInputField,
  InputField,
} from '@/components/form/form-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useImageUpload } from '@/hooks/use-image-upload'
import { getErrorMessage } from '@/lib/error-message'
import type { ImageFile } from '@/lib/image-file'
import { createBeanPurchase } from '@/lib/server/bean-purchases'
import { extractBeanInfo } from '@/lib/server/beans'
import {
  type EntityImageUploadFailure,
  uploadEntityImages,
} from '@/lib/upload-entity-images'

export function AddBeanPurchaseDialog({
  beanId,
  beanName,
  visionEnabled,
  onCreated,
}: {
  readonly beanId: number
  readonly beanName: string
  readonly visionEnabled: boolean
  readonly onCreated: () => Promise<void>
}) {
  const { defaultCurrency } = useAppSettings()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [createdPurchaseId, setCreatedPurchaseId] = useState<number | null>(
    null,
  )
  const [uploadFailures, setUploadFailures] = useState<
    readonly EntityImageUploadFailure[]
  >([])
  const [isRetryingPictures, setIsRetryingPictures] = useState(false)
  const [roastDate, setRoastDate] = useState('')
  const [weight, setWeight] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState<string>(defaultCurrency)
  const [shopUrl, setShopUrl] = useState('')
  const imageUpload = useImageUpload()

  const reset = () => {
    setRoastDate('')
    setWeight('')
    setPrice('')
    setCurrency(defaultCurrency)
    setShopUrl('')
    setCreatedPurchaseId(null)
    setUploadFailures([])
    imageUpload.clearImages()
  }

  const finish = () => {
    setOpen(false)
    reset()
  }

  const extractDetails = async () => {
    const image = imageUpload.images[0]
    if (!image) return
    setIsExtracting(true)
    try {
      const extracted = await extractBeanInfo({
        data: {
          imageBase64: image.base64,
          mimeType: image.file.type,
        },
      })
      let applied = 0
      if (extracted.roastDate) {
        setRoastDate(extracted.roastDate)
        applied += 1
      }
      if (extracted.weight) {
        setWeight(extracted.weight)
        applied += 1
      }
      if (applied === 0) {
        toast.error('No roast date or bag weight was readable')
      } else {
        toast.success(
          `Applied ${applied} bag detail${applied === 1 ? '' : 's'}`,
        )
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not read this bag'))
    } finally {
      setIsExtracting(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const purchase = await createBeanPurchase({
        data: {
          beanId,
          roastDate: roastDate ? new Date(roastDate) : null,
          initialWeightGrams: weight || null,
          price: price || null,
          priceCurrency: currency,
          shopUrl: shopUrl || null,
          isArchived: false,
        },
      })
      setCreatedPurchaseId(purchase.id)
      const uploadResult = await uploadEntityImages(
        'bean-purchases',
        purchase.id,
        imageUpload.images,
      )
      imageUpload.removeImages(uploadResult.uploaded)
      setUploadFailures(uploadResult.failures)
      await onCreated()
      toast.success('Bag added')
      if (uploadResult.failures.length === 0) finish()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not add this bag'))
    } finally {
      setSaving(false)
    }
  }

  const retryPictures = async (pictures: readonly ImageFile[]) => {
    if (!createdPurchaseId) return
    setIsRetryingPictures(true)
    try {
      const result = await uploadEntityImages(
        'bean-purchases',
        createdPurchaseId,
        pictures,
      )
      imageUpload.removeImages(result.uploaded)
      setUploadFailures(result.failures)
      if (result.uploaded.length > 0) await onCreated()
      if (result.failures.length === 0) finish()
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

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) reset()
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        Add another bag
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add another bag</DialogTitle>
          <DialogDescription>
            Record the new roast and purchase details for {beanName}. Existing
            brew history stays attached to the same coffee.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          {createdPurchaseId && uploadFailures.length > 0 ? (
            <EntityImageUploadRecovery
              upload={imageUpload}
              title="Bag saved"
              description="The bag is safe, but one or more pictures could not be uploaded. Try again, remove them, or continue without them."
              continueLabel="Done"
              previewAltPrefix="Bag"
              isBusy={isRetryingPictures}
              statusText={
                isRetryingPictures ? 'Retrying bag pictures' : undefined
              }
              imageErrors={uploadFailures.map(({ image, error }) => ({
                preview: image.preview,
                filename: image.file.name,
                message: getErrorMessage(
                  error,
                  'The server rejected this picture',
                ),
              }))}
              onRetryImages={retryPictures}
              onRemoveImage={removeFailedPicture}
              onContinue={finish}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <DateField
                  id="new-bag-roast-date"
                  label="Roast date"
                  value={roastDate}
                  onChange={setRoastDate}
                />
                <InputField
                  id="new-bag-weight"
                  label="Bag weight"
                  type="number"
                  min="0"
                  step="50"
                  unit="g"
                  unitPlacement="inline"
                  value={weight}
                  onChange={setWeight}
                />
                <div className="flex gap-2">
                  <CurrencyInputField
                    id="new-bag-price"
                    label="Price"
                    currency={currency}
                    min="0"
                    value={price}
                    onChange={setPrice}
                    className="flex-1"
                  />
                  <CurrencyField
                    id="new-bag-currency"
                    value={currency}
                    onChange={setCurrency}
                    className="w-28 [@media(hover:hover)_and_(pointer:fine)]:[&_[data-slot=select-trigger]]:h-9"
                  />
                </div>
                <InputField
                  id="new-bag-shop"
                  label="Shop URL"
                  type="url"
                  value={shopUrl}
                  onChange={setShopUrl}
                />
              </div>
              <EntityImageUploadSection
                upload={imageUpload}
                prompt="Add pictures of this bag"
                previewAltPrefix="Bag"
                helperText={
                  visionEnabled
                    ? 'AI can read the roast date and bag weight'
                    : undefined
                }
                isBusy={saving}
                statusText={saving ? 'Saving bag pictures' : undefined}
                footer={
                  visionEnabled ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={extractDetails}
                      disabled={isExtracting || imageUpload.images.length === 0}
                    >
                      {isExtracting ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Sparkles />
                      )}
                      {isExtracting ? 'Reading…' : 'Extract bag details'}
                    </Button>
                  ) : undefined
                }
              />
            </>
          )}
        </DialogBody>
        {!createdPurchaseId ? (
          <DialogFooter>
            <Button variant="outline" onClick={finish}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || isExtracting}>
              {saving ? 'Adding…' : 'Add bag'}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
