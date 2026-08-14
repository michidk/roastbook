import { useState } from 'react'
import { toast } from 'sonner'
import { InputField, TextareaField } from '@/components/form/form-field'
import { EntityForm, FormSection } from '@/components/form/form-shell'
import { createBrewingMethod } from '@/lib/server/brewing-methods'

type BrewingMethodFormProps = {
  readonly onCreated: (method: { readonly id: number }) => void
  readonly onCancel: () => void
}

/**
 * Creates a method with just a name and description. The logging fields it
 * records are configured afterwards on the method's own page.
 */
export function BrewingMethodForm({
  onCreated,
  onCancel,
}: BrewingMethodFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || isCreating) return
    setIsCreating(true)
    try {
      const method = await createBrewingMethod({
        data: { name, description, enabledParameters: [], timerEnabled: false },
      })
      if (!method) throw new Error('Could not create brewing method')
      toast.success('Brewing method created')
      onCreated(method)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not create brewing method',
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <EntityForm
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit()
      }}
      actions={{
        onCancel,
        isSubmitting: isCreating,
        disabled: !name.trim(),
        submitLabel: 'Create method',
        submittingLabel: 'Creating…',
      }}
    >
      <FormSection title="Method">
        <InputField
          id="new-brewing-method"
          label="Name"
          value={name}
          onChange={setName}
          placeholder="Chemex"
          required
        />
        <TextareaField
          id="new-brewing-method-description"
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="How this method brews coffee"
          rows={2}
        />
      </FormSection>
    </EntityForm>
  )
}
