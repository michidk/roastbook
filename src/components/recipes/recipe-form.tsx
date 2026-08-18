import { useState } from 'react'
import { toast } from 'sonner'
import { EntityForm } from '@/components/form/form-shell'
import { RecipeFields } from '@/components/recipes/recipe-fields'
import {
  EMPTY_SHOT_FORM_VALUES,
  type ShotFormValues,
} from '@/components/shots/shot-parameter-fields'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { getErrorMessage } from '@/lib/error-message'
import { shotParameterPayload } from '@/lib/new-shot-payload'
import type { getActiveBeans } from '@/lib/server/beans'
import type { getBrewingMethods } from '@/lib/server/brewing-methods'
import type { getGear } from '@/lib/server/gear'
import { createRecipe } from '@/lib/server/recipes'
import { getShotUpdateErrors } from '@/lib/update-validation'

type RecipeFormProps = {
  readonly beans: Awaited<ReturnType<typeof getActiveBeans>>
  readonly methods: Awaited<ReturnType<typeof getBrewingMethods>>
  readonly gear: Awaited<ReturnType<typeof getGear>>
  readonly onCreated: (recipe: { readonly id: number }) => void | Promise<void>
  readonly onCancel: () => void
}

export function RecipeForm({
  beans,
  methods,
  gear,
  onCreated,
  onCancel,
}: RecipeFormProps) {
  const [name, setName] = useState('')
  const [values, setValues] = useState<ShotFormValues>(EMPTY_SHOT_FORM_VALUES)
  const [fieldErrors, setFieldErrors] = useState<
    Readonly<Record<string, string>>
  >({})
  const set = <Key extends keyof ShotFormValues>(
    key: Key,
    value: ShotFormValues[Key],
  ) => setValues((current) => ({ ...current, [key]: value }))

  const { isSubmitting, handleSubmit } = useFormSubmission({
    canSubmit: () => {
      const errors: Record<string, string> = {
        ...getShotUpdateErrors(shotParameterPayload(values)),
      }
      if (!name.trim()) errors.name = 'Enter a recipe name'
      setFieldErrors(errors)
      return Boolean(
        name.trim() &&
          values.brewingMethodId &&
          Object.keys(errors).length === 0,
      )
    },
    submit: async () => {
      const recipe = await createRecipe({
        data: { name, ...shotParameterPayload(values) },
      })
      toast.success('Recipe created')
      await onCreated(recipe)
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not create recipe')),
  })

  return (
    <EntityForm
      onSubmit={handleSubmit}
      actions={{
        onCancel,
        isSubmitting,
        disabled: !name.trim() || !values.brewingMethodId,
        submitLabel: 'Create recipe',
        submittingLabel: 'Creating…',
      }}
    >
      <RecipeFields
        name={name}
        values={values}
        beans={beans}
        methods={methods}
        gear={gear}
        errors={fieldErrors}
        onNameChange={setName}
        onChange={set}
      />
    </EntityForm>
  )
}
