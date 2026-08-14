import {
  CurrencyField,
  InputField,
  SelectField,
  TextareaField,
} from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import type { GearFormValues } from '@/components/gear/gear-form-values'
import { GearSubtypeFields } from '@/components/gear/gear-subtype-fields'
import { GEAR_TYPES, type GearType } from '@/lib/constants'

type GearResearchAction = {
  readonly enabled: boolean
  readonly isResearching: boolean
  readonly onResearch: () => void
}

type GearFieldsProps = {
  readonly values: GearFormValues
  readonly onChange: <Key extends keyof GearFormValues>(
    key: Key,
    value: GearFormValues[Key],
  ) => void
  readonly research: GearResearchAction
  readonly idPrefix?: string
}

export function GearFields({
  values,
  onChange,
  research,
  idPrefix = 'gear',
}: GearFieldsProps) {
  const id = (field: string) => `${idPrefix}-${field}`

  return (
    <>
      <FormSection title="Equipment info">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id={id('name')}
            label="Name"
            placeholder="e.g., My Grinder"
            value={values.name}
            onChange={(value) => onChange('name', value)}
            required
          />
          <SelectField
            id={id('type')}
            label="Type"
            placeholder="Select type"
            value={values.type}
            onChange={(value) => onChange('type', value as GearType | '')}
            options={GEAR_TYPES}
            required
          />
          <InputField
            id={id('brand')}
            label="Brand"
            placeholder="e.g., Niche"
            value={values.brand}
            onChange={(value) => onChange('brand', value)}
          />
          <InputField
            id={id('model')}
            label="Model"
            placeholder="e.g., Zero"
            value={values.model}
            onChange={(value) => onChange('model', value)}
          />
        </div>
        <TextareaField
          id={id('notes')}
          label="Notes"
          placeholder="Any additional info about this equipment"
          value={values.notes}
          onChange={(value) => onChange('notes', value)}
          rows={3}
        />
      </FormSection>

      <GearSubtypeFields
        type={values.type}
        values={values}
        onChange={onChange}
        research={{
          ...research,
          disabled:
            !values.name.trim() || !values.brand.trim() || !values.model.trim(),
        }}
      />

      <FormSection title="Purchase info">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <InputField
            id={id('purchaseDate')}
            label="Purchase date"
            type="date"
            value={values.purchaseDate}
            onChange={(value) => onChange('purchaseDate', value)}
          />
          <InputField
            id={id('purchasePrice')}
            label="Price"
            type="number"
            placeholder="e.g., 599.00"
            value={values.purchasePrice}
            onChange={(value) => onChange('purchasePrice', value)}
            step="1"
            min="0"
          />
          <CurrencyField
            id={id('priceCurrency')}
            value={values.priceCurrency}
            onChange={(value) => onChange('priceCurrency', value)}
          />
        </div>
      </FormSection>

      <FormSection title="Links">
        <InputField
          id={id('productUrl')}
          label="Product page"
          type="url"
          placeholder="https://…"
          value={values.productUrl}
          onChange={(value) => onChange('productUrl', value)}
        />
        <InputField
          id={id('manualUrl')}
          label="Manual / Documentation"
          type="url"
          placeholder="https://…"
          value={values.manualUrl}
          onChange={(value) => onChange('manualUrl', value)}
        />
      </FormSection>
    </>
  )
}
