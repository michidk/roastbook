import { Loader2, Pencil, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  type EntityImage,
  EntityImageGallery,
} from '@/components/entity-image-gallery'
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
import { Checkbox } from '@/components/ui/checkbox'
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
import { Label } from '@/components/ui/label'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useImageUpload } from '@/hooks/use-image-upload'
import {
  createBeanPurchase,
  updateBeanPurchase,
} from '@/lib/client/journal/bean-purchases'
import { extractBeanInfo } from '@/lib/client/journal/beans'
import { getErrorMessage } from '@/lib/error-message'
import type { ImageFile } from '@/lib/image-file'
import {
  type EntityImageUploadFailure,
  uploadEntityImages,
} from '@/lib/upload-entity-images'

type BagDetails = {
  readonly initialWeightGrams: string | null
  readonly price: string | null
  readonly priceCurrency: string | null
  readonly shopName: string | null
  readonly shopUrl: string | null
}

export function BeanPurchaseDialog({
  beanId,
  beanName,
  visionEnabled,
  onSaved,
  purchase,
  images = [],
  previous,
}: {
  readonly purchase?: BagDetails & {
    readonly id: number
    readonly roastDate: Date | string | null
  }
  /** The latest bag of this coffee; a new bag starts from its details, except the roast date. */
  readonly previous?: BagDetails
  readonly images?: readonly EntityImage[]
  readonly beanId: number
  readonly beanName: string
  readonly visionEnabled: boolean
  readonly onSaved: () => void | Promise<void>
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
  const [shopName, setShopName] = useState('')
  const [shopUrl, setShopUrl] = useState('')
  const [savePictures, setSavePictures] = useState(false)
  const imageUpload = useImageUpload()

  const reset = () => {
    setRoastDate(
      purchase?.roastDate
        ? new Date(purchase.roastDate).toISOString().slice(0, 10)
        : '',
    )
    const details = purchase ?? previous
    setWeight(details?.initialWeightGrams ?? '')
    setPrice(details?.price ?? '')
    setCurrency(details?.priceCurrency ?? defaultCurrency)
    setShopName(details?.shopName ?? '')
    setShopUrl(details?.shopUrl ?? '')
    setSavePictures(false)
    setCreatedPurchaseId(null)
    setUploadFailures([])
    imageUpload.clearImages()
  }

  const finish = () => {
    setOpen(false)
    reset()
  }

  const extractDetails = async () => {
    if (imageUpload.images.length === 0) return
    setIsExtracting(true)
    try {
      const extracted = await extractBeanInfo({
        data: {
          images: imageUpload.images.slice(0, 6).map((image) => ({
            imageBase64: image.base64,
            mimeType: image.file.type,
          })),
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
      const values = {
        beanId,
        roastDate: roastDate ? new Date(roastDate) : null,
        initialWeightGrams: weight || null,
        price: price || null,
        priceCurrency: currency,
        shopName: shopName.trim() || null,
        shopUrl: shopUrl || null,
      }
      const savedPurchase = purchase
        ? await updateBeanPurchase({ data: { ...values, id: purchase.id } })
        : await createBeanPurchase({ data: { ...values, isArchived: false } })
      setCreatedPurchaseId(savedPurchase.id)
      const uploadResult = await uploadEntityImages(
        'bean-purchases',
        savedPurchase.id,
        savePictures ? imageUpload.images : [],
      )
      imageUpload.removeImages(uploadResult.uploaded)
      setUploadFailures(uploadResult.failures)
      await onSaved()
      toast.success(purchase ? 'Bag updated' : 'Bag added')
      if (uploadResult.failures.length === 0) finish()
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          purchase ? 'Could not update this bag' : 'Could not add this bag',
        ),
      )
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
      if (result.uploaded.length > 0) await onSaved()
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
        if (saving || isExtracting || isRetryingPictures) return
        reset()
        setOpen(nextOpen)
      }}
    >
      <DialogTrigger
        render={<Button size="sm" variant={purchase ? 'outline' : 'default'} />}
      >
        {purchase ? <Pencil /> : <Plus />}
        {purchase ? 'Edit bag' : 'Add another bag'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{purchase ? 'Edit bag' : 'Add another bag'}</DialogTitle>
          <DialogDescription>
            {purchase
              ? `Update the bag details for ${beanName}. Brew history stays linked to this bag. Picture changes are saved immediately.`
              : `Record the new roast and purchase details for ${beanName}. Existing brew history stays attached to the same coffee.`}
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
                <div className="flex gap-2 sm:col-span-2">
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
                  id="new-bag-shop-name"
                  label="Shop"
                  value={shopName}
                  onChange={setShopName}
                />
                <InputField
                  id="new-bag-shop"
                  label="Shop URL (optional)"
                  type="url"
                  value={shopUrl}
                  onChange={setShopUrl}
                />
              </div>
              {purchase ? (
                <EntityImageGallery
                  entityType="bean-purchases"
                  entityId={purchase.id}
                  images={images}
                  onImagesChange={onSaved}
                  editable
                />
              ) : (
                <EntityImageUploadSection
                  upload={imageUpload}
                  prompt="Add pictures of this bag"
                  previewAltPrefix="Bag"
                  helperText={
                    visionEnabled
                      ? 'AI can read the roast date and bag weight. Pictures are only used for that unless you save them.'
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
                        disabled={
                          isExtracting || imageUpload.images.length === 0
                        }
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
              )}
              {!purchase && imageUpload.images.length > 0 ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="new-bag-save-pictures"
                    checked={savePictures}
                    onCheckedChange={(checked) => setSavePictures(checked)}
                  />
                  <Label htmlFor="new-bag-save-pictures">
                    Also save these pictures with this coffee
                  </Label>
                </div>
              ) : null}
            </>
          )}
        </DialogBody>
        {!createdPurchaseId ? (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={finish}
              disabled={saving || isExtracting}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || isExtracting}>
              {saving ? 'Saving…' : purchase ? 'Save changes' : 'Add bag'}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
