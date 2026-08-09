import { useState, type SyntheticEvent } from "react"
import { toast } from "sonner"
import { InputField, TextareaField } from "@/components/form/form-field"
import {
  EntityForm,
  FormActions,
  FormSection,
} from "@/components/form/form-shell"
import { useFormState } from "@/hooks/use-form-state"
import { createRecipe } from "@/lib/server/recipes"

type CreatedRecipe = Awaited<ReturnType<typeof createRecipe>>

interface RecipeFormProps {
  onCreated: (recipe: CreatedRecipe) => void | Promise<void>
  onCancel: () => void
  initialName?: string
}

export function RecipeForm({
  onCreated,
  onCancel,
  initialName = "",
}: RecipeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useFormState({
    name: initialName,
    defaultDoseGrams: "",
    defaultYieldGrams: "",
    defaultBrewTimeSeconds: "",
    defaultGrindSetting: "",
    defaultWaterTempCelsius: "",
    defaultPressure: "",
    notes: "",
  })

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.values.name.trim()) return

    setIsSubmitting(true)
    try {
      const recipe = await createRecipe({
        data: {
          name: form.values.name,
          defaultDoseGrams: form.values.defaultDoseGrams || undefined,
          defaultYieldGrams: form.values.defaultYieldGrams || undefined,
          defaultBrewTimeSeconds: form.values.defaultBrewTimeSeconds
            ? Number(form.values.defaultBrewTimeSeconds)
            : undefined,
          defaultGrindSetting: form.values.defaultGrindSetting || undefined,
          defaultWaterTempCelsius:
            form.values.defaultWaterTempCelsius || undefined,
          defaultPressure: form.values.defaultPressure || undefined,
          notes: form.values.notes || undefined,
        },
      })
      await onCreated(recipe)
    } catch {
      toast.error("Could not save this recipe")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <EntityForm onSubmit={handleSubmit}>
      <FormSection title="Recipe">
        <InputField
          id="recipe-name"
          label="Name"
          placeholder="e.g., 18g in, 36g out"
          value={form.values.name}
          onChange={form.setField("name")}
          required
        />
      </FormSection>

      <FormSection
        title="Defaults"
        description="Use these values as a starting point for future shots."
      >
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <InputField
            id="recipe-dose"
            label="Dose (g)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            placeholder="18.0"
            value={form.values.defaultDoseGrams}
            onChange={form.setField("defaultDoseGrams")}
          />
          <InputField
            id="recipe-yield"
            label="Target yield (g)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            placeholder="36.0"
            value={form.values.defaultYieldGrams}
            onChange={form.setField("defaultYieldGrams")}
          />
          <InputField
            id="recipe-time"
            label="Target shot time (seconds)"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder="30"
            value={form.values.defaultBrewTimeSeconds}
            onChange={form.setField("defaultBrewTimeSeconds")}
          />
          <InputField
            id="recipe-grind"
            label="Grind setting"
            placeholder="e.g., 15"
            value={form.values.defaultGrindSetting}
            onChange={form.setField("defaultGrindSetting")}
          />
          <InputField
            id="recipe-temperature"
            label="Brew temperature (°C)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            placeholder="93.0"
            value={form.values.defaultWaterTempCelsius}
            onChange={form.setField("defaultWaterTempCelsius")}
          />
          <InputField
            id="recipe-pressure"
            label="Target brew pressure (bar)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            placeholder="9.0"
            value={form.values.defaultPressure}
            onChange={form.setField("defaultPressure")}
          />
        </div>
      </FormSection>

      <FormSection title="Notes">
        <TextareaField
          id="recipe-notes"
          label="Notes"
          placeholder="Preparation notes or dialing-in guidance"
          value={form.values.notes}
          onChange={form.setField("notes")}
          rows={3}
        />
      </FormSection>

      <FormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        disabled={!form.values.name.trim()}
        submitLabel="Add Recipe"
      />
    </EntityForm>
  )
}
