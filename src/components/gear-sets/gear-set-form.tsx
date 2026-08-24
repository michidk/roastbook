import { toast } from 'sonner'
import { EntityForm } from '@/components/form/form-shell'
import { GearSetFields } from '@/components/gear-sets/gear-set-fields'
import {
  EMPTY_GEAR_SET_FORM_VALUES,
  gearSetWritePayload,
} from '@/components/gear-sets/gear-set-form-values'
import type { GearOption } from '@/components/shots/shot-parameter-fields'
import { useFormState } from '@/hooks/use-form-state'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { createGearSet } from '@/lib/server/gear-sets'

type GearSetFormProps = {
  readonly gear: readonly GearOption[]
  readonly onCreated: (gearSet: { readonly id: number }) => void
  readonly onCancel: () => void
}

export function GearSetForm({ gear, onCreated, onCancel }: GearSetFormProps) {
  const { values, set } = useFormState(EMPTY_GEAR_SET_FORM_VALUES)
  const { isSubmitting, handleSubmit } = useFormSubmission({
    canSubmit: () => Boolean(values.name.trim()),
    submit: async () => {
      const gearSet = await createGearSet({
        data: gearSetWritePayload(values),
      })
      toast.success('Gear set created')
      onCreated(gearSet)
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Could not create gear set',
      ),
  })

  return (
    <EntityForm
      onSubmit={handleSubmit}
      actions={{
        onCancel,
        isSubmitting,
        disabled: !values.name.trim(),
        submitLabel: 'Create gear set',
        submittingLabel: 'Creating…',
      }}
    >
      <GearSetFields
        idPrefix="new-gear-set"
        values={values}
        gear={gear}
        onChange={set}
      />
    </EntityForm>
  )
}
