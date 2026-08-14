import type { Dispatch, FormEvent, SetStateAction } from 'react'
import {
  CurrencyField,
  InputField,
  SelectField,
  TextareaField,
} from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import type { GearFormValues } from '@/components/gear/gear-form-values'
import { GearSubtypeFields } from '@/components/gear/gear-subtype-fields'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GEAR_TYPES, type GearType } from '@/lib/constants'

export function GearEditForm({
  formData,
  setFormData,
  onSubmit,
  researchEnabled,
  isResearching,
  onResearch,
}: {
  formData: GearFormValues
  setFormData: Dispatch<SetStateAction<GearFormValues>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  researchEnabled: boolean
  isResearching: boolean
  onResearch: () => void
}) {
  const set = <Key extends keyof GearFormValues>(
    key: Key,
    value: GearFormValues[Key],
  ) => setFormData((current) => ({ ...current, [key]: value }))

  return (
    <form id="gear-edit-form" onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Equipment info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="name"
              label="Name"
              placeholder="e.g., My Grinder"
              value={formData.name}
              onChange={(value) => set('name', value)}
              required
            />
            <SelectField
              id="type"
              label="Type"
              placeholder="Select type"
              value={formData.type}
              onChange={(value) => set('type', (value ?? '') as GearType | '')}
              options={GEAR_TYPES}
              required
            />
            <InputField
              id="brand"
              label="Brand"
              placeholder="e.g., Niche"
              value={formData.brand}
              onChange={(value) => set('brand', value)}
            />
            <InputField
              id="model"
              label="Model"
              placeholder="e.g., Zero"
              value={formData.model}
              onChange={(value) => set('model', value)}
            />
          </div>
          <TextareaField
            id="notes"
            label="Notes"
            placeholder="Any additional info about this equipment"
            value={formData.notes}
            onChange={(value) => set('notes', value)}
            rows={3}
          />
        </CardContent>
      </Card>
      <GearSubtypeFields
        type={formData.type}
        values={formData}
        onChange={set}
        research={{
          enabled: researchEnabled,
          isResearching,
          onResearch,
          disabled:
            !formData.name.trim() ||
            !formData.brand.trim() ||
            !formData.model.trim(),
        }}
      />
      <Card>
        <CardHeader>
          <CardTitle>Purchase info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <InputField
              id="purchaseDate"
              label="Purchase Date"
              type="date"
              value={formData.purchaseDate}
              onChange={(value) => set('purchaseDate', value)}
            />
            <InputField
              id="purchasePrice"
              label="Price"
              type="number"
              placeholder="e.g., 599.00"
              value={formData.purchasePrice}
              onChange={(value) => set('purchasePrice', value)}
              step="1"
              min="0"
            />
            <CurrencyField
              id="priceCurrency"
              value={formData.priceCurrency}
              onChange={(value) => set('priceCurrency', value)}
            />
          </div>
        </CardContent>
      </Card>
      <FormSection title="Links">
        <InputField
          id="productUrl"
          label="Product Page"
          type="url"
          placeholder="https://…"
          value={formData.productUrl}
          onChange={(value) => set('productUrl', value)}
        />
        <InputField
          id="manualUrl"
          label="Manual / Documentation"
          type="url"
          placeholder="https://…"
          value={formData.manualUrl}
          onChange={(value) => set('manualUrl', value)}
        />
      </FormSection>
    </form>
  )
}
