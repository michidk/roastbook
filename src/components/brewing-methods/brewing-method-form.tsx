import { useState } from 'react'
import { toast } from 'sonner'
import { BrewingMethodDrinkTypesField } from '@/components/brewing-methods/brewing-method-drink-types-field'
import { InputField, TextareaField } from '@/components/form/form-field'
import { EntityForm, FormSection } from '@/components/form/form-shell'
import type { DrinkTypeOption } from '@/lib/drink-options'
import { createBrewingMethod } from '@/lib/server/brewing-methods'

type BrewingMethodFormProps = {
  readonly drinkTypes: readonly DrinkTypeOption[]
  readonly onCreated: (method: { readonly id: number }) => void
  readonly onCancel: () => void
}

export function BrewingMethodForm({
  drinkTypes,
  onCreated,
  onCancel,
}: BrewingMethodFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [drinkTypeIds, setDrinkTypeIds] = useState<readonly number[]>([])
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || isCreating) return
    setIsCreating(true)
    try {
      const method = await createBrewingMethod({
        data: {
          name,
          description,
          enabledParameters: [],
          timerEnabled: false,
          drinkTypeIds,
        },
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
      <FormSection
        title="Available drink types"
        description="Choose types to limit the new-brew list for this method. Leave all unselected to allow every active type."
      >
        <BrewingMethodDrinkTypesField
          drinkTypes={drinkTypes}
          value={drinkTypeIds}
          onChange={setDrinkTypeIds}
        />
      </FormSection>
    </EntityForm>
  )
}
