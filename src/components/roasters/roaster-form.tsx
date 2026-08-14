import { toast } from 'sonner'
import { InputField, TextareaField } from '@/components/form/form-field'
import { EntityForm, FormSection } from '@/components/form/form-shell'
import type { RoasterFormValues } from '@/components/roasters/roaster-form-values'
import { RoasterResearchAction } from '@/components/roasters/roaster-research-action'
import { useFormState } from '@/hooks/use-form-state'
import { useFormSubmission } from '@/hooks/use-form-submission'
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
  const form = useFormState<RoasterFormValues>({
    name: initialName,
    location: '',
    country: '',
    website: '',
    instagramHandle: '',
    notes: '',
  })

  const { isSubmitting, handleSubmit } = useFormSubmission({
    canSubmit: () => Boolean(form.values.name.trim()),
    submit: async () => {
      const roaster = await createRoaster({
        data: {
          name: form.values.name.trim(),
          location: form.values.location.trim() || undefined,
          country: form.values.country.trim() || undefined,
          website: form.values.website.trim() || undefined,
          instagramHandle: form.values.instagramHandle.trim() || undefined,
          notes: form.values.notes.trim() || undefined,
        },
      })
      await onCreated(roaster)
    },
    onError: () => toast.error('Failed to create roaster'),
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
      <FormSection
        title="Roaster info"
        action={
          <RoasterResearchAction
            currentData={form.values}
            disabled={isSubmitting}
            onApply={(updates) => {
              form.patch(updates)
              toast.success(`Applied ${Object.keys(updates).length} changes`)
            }}
          />
        }
      >
        <InputField
          id="roaster-name"
          label="Name"
          placeholder="e.g., Onyx Coffee Lab"
          value={form.values.name}
          onChange={form.setField('name')}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="roaster-location"
            label="Location"
            placeholder="e.g., Rogers, Arkansas"
            value={form.values.location}
            onChange={form.setField('location')}
          />
          <InputField
            id="roaster-country"
            label="Country"
            placeholder="e.g., United States"
            value={form.values.country}
            onChange={form.setField('country')}
          />
        </div>
      </FormSection>

      <FormSection title="Links">
        <InputField
          id="roaster-website"
          label="Website"
          type="url"
          placeholder="https://…"
          value={form.values.website}
          onChange={form.setField('website')}
        />
        <InputField
          id="roaster-instagram"
          label="Instagram"
          placeholder="@handle"
          value={form.values.instagramHandle}
          onChange={form.setField('instagramHandle')}
        />
      </FormSection>

      <FormSection title="Notes">
        <TextareaField
          id="roaster-notes"
          label=""
          placeholder="Any notes about this roaster…"
          value={form.values.notes}
          onChange={form.setField('notes')}
          rows={3}
        />
      </FormSection>
    </EntityForm>
  )
}
