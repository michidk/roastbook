import { toast } from 'sonner'
import { EntityForm } from '@/components/form/form-shell'
import { RoasterFields } from '@/components/roasters/roaster-fields'
import {
  createRoasterFormValues,
  roasterCreatePayload,
} from '@/components/roasters/roaster-form-values'
import { useFormState } from '@/hooks/use-form-state'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { getErrorMessage } from '@/lib/error-message'
import { createRoaster } from '@/lib/server/roasters'

type CreatedRoaster = Awaited<ReturnType<typeof createRoaster>>

interface RoasterFormProps {
  onCreated: (roaster: CreatedRoaster) => void | Promise<void>
  onCancel: () => void
  initialName?: string
  submitLabel?: string
}

export function RoasterForm({
  onCreated,
  onCancel,
  initialName = '',
  submitLabel = 'Create roaster',
}: RoasterFormProps) {
  const form = useFormState(createRoasterFormValues(null, initialName))

  const { isSubmitting, handleSubmit } = useFormSubmission({
    canSubmit: () => Boolean(form.values.name.trim()),
    submit: async () => {
      const roaster = await createRoaster({
        data: roasterCreatePayload(form.values),
      })
      await onCreated(roaster)
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Failed to create roaster')),
  })

  return (
    <EntityForm
      onSubmit={handleSubmit}
      actions={{
        onCancel,
        isSubmitting,
        disabled: !form.values.name.trim(),
        submitLabel,
        submittingLabel: 'Creating…',
      }}
    >
      <RoasterFields values={form.values} onChange={form.set} />
    </EntityForm>
  )
}
