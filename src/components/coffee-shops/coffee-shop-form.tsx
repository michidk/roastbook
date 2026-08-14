import { toast } from 'sonner'
import {
  applyCoffeeShopSearchResult,
  createCoffeeShopFormValues,
} from '@/components/coffee-shops/coffee-shop-form-values'
import {
  CoffeeShopOsmSearch,
  type CoffeeShopSearchResult,
} from '@/components/coffee-shops/coffee-shop-osm-search'
import { InputField, TextareaField } from '@/components/form/form-field'
import { EntityForm, FormSection } from '@/components/form/form-shell'
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
        data: {
          name: form.values.name,
          address: form.values.address || undefined,
          city: form.values.city || undefined,
          country: form.values.country || undefined,
          latitude: form.values.latitude || undefined,
          longitude: form.values.longitude || undefined,
          website: form.values.website || undefined,
          notes: form.values.notes || undefined,
        },
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
      <FormSection title="Basic info">
        <CoffeeShopOsmSearch
          onApply={applySearchResult}
          initialQuery={initialName}
        />

        <InputField
          id="name"
          label="Name"
          placeholder="e.g., Blue Bottle Coffee"
          value={form.values.name}
          onChange={form.setField('name')}
          required
        />

        <InputField
          id="address"
          label="Address"
          placeholder="Street address"
          value={form.values.address}
          onChange={form.setField('address')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="city"
            label="City"
            placeholder="e.g., San Francisco"
            value={form.values.city}
            onChange={form.setField('city')}
          />
          <InputField
            id="country"
            label="Country"
            placeholder="e.g., USA"
            value={form.values.country}
            onChange={form.setField('country')}
          />
        </div>
      </FormSection>

      <FormSection
        title="Coordinates"
        description="Add coordinates to pin this café on the map. You can leave these blank and add them later."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="latitude"
            label="Latitude"
            type="number"
            min={-90}
            max={90}
            step="0.001"
            showStepper={false}
            placeholder="e.g., 37.7764"
            value={form.values.latitude}
            onChange={form.setField('latitude')}
          />
          <InputField
            id="longitude"
            label="Longitude"
            type="number"
            min={-180}
            max={180}
            step="0.001"
            showStepper={false}
            placeholder="e.g., -122.4231"
            value={form.values.longitude}
            onChange={form.setField('longitude')}
          />
        </div>
      </FormSection>

      <FormSection title="Online">
        <InputField
          id="website"
          label="Website"
          type="url"
          placeholder="https://…"
          value={form.values.website}
          onChange={form.setField('website')}
        />
      </FormSection>

      <FormSection title="Notes">
        <TextareaField
          id="notes"
          label=""
          placeholder="Any notes about this café"
          value={form.values.notes}
          onChange={form.setField('notes')}
          rows={3}
        />
      </FormSection>
    </EntityForm>
  )
}
