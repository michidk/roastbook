import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { GearFields } from '@/components/gear/gear-fields'
import type { GearFormValues } from '@/components/gear/gear-form-values'

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
      <GearFields
        values={formData}
        onChange={set}
        research={{
          enabled: researchEnabled,
          isResearching,
          onResearch,
        }}
        idPrefix="gear-edit"
      />
    </form>
  )
}
