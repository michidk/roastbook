import type { ReactNode } from 'react'
import type { BeanFormValues } from '@/components/beans/bean-form-values'
import { DateField } from '@/components/form/date-field'
import {
  CurrencyField,
  InputField,
  SelectField,
  TextareaField,
} from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import {
  type RoasterOption,
  RoasterPicker,
} from '@/components/roasters/roaster-picker'
import {
  BEAN_TYPES,
  type BeanType,
  PROCESS_METHODS,
  ROAST_LEVELS,
  type RoastLevel,
} from '@/lib/constants'

type BeanFieldsProps = {
  readonly values: BeanFormValues
  readonly onChange: <Key extends keyof BeanFormValues>(
    key: Key,
    value: BeanFormValues[Key],
  ) => void
  readonly roasters: readonly RoasterOption[]
  readonly idPrefix?: string
  readonly basicAction?: ReactNode
}

export function BeanFields({
  values,
  onChange,
  roasters,
  idPrefix = 'bean',
  basicAction,
}: BeanFieldsProps) {
  const id = (field: string) => `${idPrefix}-${field}`

  return (
    <>
      <FormSection title="Basic info" action={basicAction}>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id={id('name')}
            label="Name"
            placeholder="e.g., Ethiopia Yirgacheffe"
            value={values.name}
            onChange={(value) => onChange('name', value)}
            required
          />
          <RoasterPicker
            id={id('roasterId')}
            label="Roaster"
            placeholder="Select roaster"
            value={values.roasterId}
            onChange={(value) => onChange('roasterId', value)}
            roasters={roasters}
          />
          <SelectField
            id={id('type')}
            label="Type"
            placeholder="Select type"
            value={values.type}
            onChange={(value) => onChange('type', value as BeanType | '')}
            options={BEAN_TYPES}
          />
          <InputField
            id={id('weight')}
            label="Bag weight"
            type="number"
            min="0"
            step="50"
            unit="g"
            placeholder="e.g., 250"
            value={values.weight}
            onChange={(value) => onChange('weight', value)}
          />
          <div className="flex gap-2">
            <InputField
              id={id('price')}
              label="Price"
              type="number"
              min="0"
              step="1"
              placeholder="e.g., 15.00"
              value={values.price}
              onChange={(value) => onChange('price', value)}
              className="flex-1"
            />
            <CurrencyField
              id={id('priceCurrency')}
              value={values.priceCurrency}
              onChange={(value) => onChange('priceCurrency', value)}
              className="w-28"
            />
          </div>
          <InputField
            id={id('shopUrl')}
            label="Shop URL"
            type="url"
            placeholder="https://…"
            value={values.shopUrl}
            onChange={(value) => onChange('shopUrl', value)}
          />
        </div>
      </FormSection>

      <FormSection title="Origin">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id={id('origin')}
            label="Country"
            placeholder="e.g., Ethiopia"
            value={values.origin}
            onChange={(value) => onChange('origin', value)}
          />
          <InputField
            id={id('region')}
            label="Region"
            placeholder="e.g., Yirgacheffe"
            value={values.region}
            onChange={(value) => onChange('region', value)}
          />
          <InputField
            id={id('farm')}
            label="Farm/Producer"
            placeholder="e.g., Konga Cooperative"
            value={values.farm}
            onChange={(value) => onChange('farm', value)}
          />
          <InputField
            id={id('variety')}
            label="Variety"
            placeholder="e.g., Heirloom"
            value={values.variety}
            onChange={(value) => onChange('variety', value)}
          />
        </div>
      </FormSection>

      <FormSection title="Processing">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <SelectField
            id={id('process')}
            label="Process"
            placeholder="Select process"
            value={values.process}
            onChange={(value) => onChange('process', value)}
            options={PROCESS_METHODS}
          />
          <SelectField
            id={id('roastLevel')}
            label="Roast level"
            placeholder="Select level"
            value={values.roastLevel}
            onChange={(value) =>
              onChange('roastLevel', value as RoastLevel | '')
            }
            options={ROAST_LEVELS}
          />
          <DateField
            id={id('roastDate')}
            label="Roast date"
            value={values.roastDate}
            onChange={(value) => onChange('roastDate', value)}
          />
        </div>
      </FormSection>

      <FormSection title="Notes">
        <TextareaField
          id={id('notes')}
          label="Notes"
          placeholder="Tasting notes, brewing tips, or other observations"
          value={values.notes}
          onChange={(value) => onChange('notes', value)}
          rows={4}
        />
      </FormSection>
    </>
  )
}
