import { toast } from 'sonner'
import { CoffeeShopFields } from '@/components/coffee-shops/coffee-shop-fields'
import {
  applyCoffeeShopSearchResult,
  coffeeShopCreatePayload,
  createCoffeeShopFormValues,
} from '@/components/coffee-shops/coffee-shop-form-values'
import type { CoffeeShopSearchResult } from '@/components/coffee-shops/coffee-shop-osm-search'
import { EntityForm } from '@/components/form/form-shell'
import { useFormState } from '@/hooks/use-form-state'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { getErrorMessage } from '@/lib/error-message'
import { createCoffeeShop } from '@/lib/server/coffee-shops'

type CreatedCoffeeShop = Awaited<ReturnType<typeof createCoffeeShop>>

interface CoffeeShopFormProps {
  onCreated: (coffeeShop: CreatedCoffeeShop) => void | Promise<void>
  onCancel: () => void
  initialName?: string
  submitLabel?: string
}

export function CoffeeShopForm({
  onCreated,
  onCancel,
  initialName = '',
  submitLabel = 'Add café',
}: CoffeeShopFormProps) {
  const form = useFormState(createCoffeeShopFormValues(null, initialName))

  const applySearchResult = (result: CoffeeShopSearchResult) => {
    form.setValues((current) => applyCoffeeShopSearchResult(current, result))
  }

  const { isSubmitting, handleSubmit } = useFormSubmission({
    canSubmit: () => Boolean(form.values.name.trim()),
    submit: async () => {
      const coffeeShop = await createCoffeeShop({
        data: coffeeShopCreatePayload(form.values),
      })
      toast.success('Café created')
      await onCreated(coffeeShop)
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not save this café')),
  })

  return (
    <EntityForm
      onSubmit={handleSubmit}
      actions={{
        onCancel,
        isSubmitting,
        disabled: !form.values.name.trim(),
        submitLabel,
      }}
    >
      <CoffeeShopFields
        values={form.values}
        onChange={form.set}
        onApplySearchResult={applySearchResult}
        initialQuery={initialName}
      />
    </EntityForm>
  )
}
