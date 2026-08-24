import { toast } from 'sonner'
import { EntityForm } from '@/components/form/form-shell'
import { RoasterFields } from '@/components/roasters/roaster-fields'
import {
  createRoasterFormValues,
  type RoasterFormValues,
  roasterCreatePayload,
} from '@/components/roasters/roaster-form-values'
import { RoasterResearchAction } from '@/components/roasters/roaster-research-action'
import { useFormState } from '@/hooks/use-form-state'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { getErrorMessage } from '@/lib/error-message'
import { createRoaster } from '@/lib/server/roasters'

type CreatedRoaster = Awaited<ReturnType<typeof createRoaster>>

interface RoasterFormProps {
  onCreated: (roaster: CreatedRoaster) => void | Promise<void>
  onCancel: () => void
  initialName?: string
  initialValues?: Partial<RoasterFormValues>
  submitLabel?: string
}

export function RoasterForm({
  onCreated,
  onCancel,
  initialName = '',
  initialValues,
  submitLabel = 'Create roaster',
}: RoasterFormProps) {
  const form = useFormState({
    ...createRoasterFormValues(null, initialName),
    ...initialValues,
  })

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
      <div className="flex justify-end">
        <RoasterResearchAction
          currentData={form.values}
          disabled={isSubmitting}
          onApply={(updates) => {
            form.patch(updates)
            toast.success(`Applied ${Object.keys(updates).length} changes`)
          }}
        />
      </div>
      <RoasterFields values={form.values} onChange={form.set} />
    </EntityForm>
  )
}
