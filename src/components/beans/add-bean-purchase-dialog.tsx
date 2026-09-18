import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DateField } from '@/components/form/date-field'
import {
  CurrencyField,
  CurrencyInputField,
  InputField,
} from '@/components/form/form-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAppSettings } from '@/hooks/use-app-settings'
import { getErrorMessage } from '@/lib/error-message'
import { createBeanPurchase } from '@/lib/server/bean-purchases'

export function AddBeanPurchaseDialog({
  beanId,
  beanName,
  onCreated,
}: {
  readonly beanId: number
  readonly beanName: string
  readonly onCreated: () => Promise<void>
}) {
  const { defaultCurrency } = useAppSettings()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [roastDate, setRoastDate] = useState('')
  const [weight, setWeight] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState<string>(defaultCurrency)
  const [shopUrl, setShopUrl] = useState('')

  const save = async () => {
    setSaving(true)
    try {
      await createBeanPurchase({
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
      setOpen(false)
      setRoastDate('')
      setWeight('')
      setPrice('')
      setShopUrl('')
      await onCreated()
      toast.success('Bag added')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not add this bag'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              className="w-28"
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Adding…' : 'Add bag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
