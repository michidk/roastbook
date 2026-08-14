import { InputField, TextareaField } from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import type { RoasterFormValues } from '@/components/roasters/roaster-form-values'

type RoasterFieldsProps = {
  readonly values: RoasterFormValues
  readonly onChange: <Key extends keyof RoasterFormValues>(
    key: Key,
    value: RoasterFormValues[Key],
  ) => void
  readonly idPrefix?: string
}

export function RoasterFields({
  values,
  onChange,
  idPrefix = 'roaster',
}: RoasterFieldsProps) {
  const id = (field: string) => `${idPrefix}-${field}`

  return (
    <>
      <FormSection title="Roaster info">
        <InputField
          id={id('name')}
          label="Name"
          placeholder="e.g., Onyx Coffee Lab"
          value={values.name}
          onChange={(value) => onChange('name', value)}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id={id('location')}
            label="Location"
            placeholder="e.g., Rogers, Arkansas"
            value={values.location}
            onChange={(value) => onChange('location', value)}
          />
          <InputField
            id={id('country')}
            label="Country"
            placeholder="e.g., United States"
            value={values.country}
            onChange={(value) => onChange('country', value)}
          />
        </div>
      </FormSection>

      <FormSection title="Links">
        <InputField
          id={id('website')}
          label="Website"
          type="url"
          placeholder="https://…"
          value={values.website}
          onChange={(value) => onChange('website', value)}
        />
        <InputField
          id={id('instagramHandle')}
          label="Instagram"
          placeholder="@handle"
          value={values.instagramHandle}
          onChange={(value) => onChange('instagramHandle', value)}
        />
      </FormSection>

      <FormSection title="Notes">
        <TextareaField
          id={id('notes')}
          label="Notes"
          placeholder="Any notes about this roaster…"
          value={values.notes}
          onChange={(value) => onChange('notes', value)}
          rows={3}
        />
      </FormSection>
    </>
  )
}
