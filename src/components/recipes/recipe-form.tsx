import { useState, type SyntheticEvent } from "react"
import { toast } from "sonner"
import {
  InputField,
  SelectField,
  TextareaField,
} from "@/components/form/form-field"
import { EntityForm, FormSection } from "@/components/form/form-shell"
import { useFormState } from "@/hooks/use-form-state"
import { BREWING_METHOD_OPTIONS, type BrewingMethod } from "@/lib/recipes"
import { createRecipe, updateRecipe } from "@/lib/server/recipes"

type CreatedRecipe = Awaited<ReturnType<typeof createRecipe>>

type EditableRecipe = {
  readonly id: number
  readonly name: string
  readonly brewingMethod: BrewingMethod
  readonly defaultDoseGrams: string | null
  readonly defaultYieldGrams: string | null
  readonly defaultBrewTimeSeconds: number | null
  readonly defaultGrindSetting: string | null
  readonly defaultWaterTempCelsius: string | null
  readonly defaultPressure: string | null
  readonly notes: string | null
}

type RecipeFormProps =
  | {
      readonly mode?: "create"
      readonly onCreated: (recipe: CreatedRecipe) => void | Promise<void>
      readonly onCancel: () => void
      readonly initialName?: string
    }
  | {
      readonly mode: "edit"
      readonly recipe: EditableRecipe
      readonly onSaved: () => void | Promise<void>
      readonly onCancel: () => void
    }

export function RecipeForm(props: RecipeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const recipe = props.mode === "edit" ? props.recipe : null
  const initialName = props.mode === "edit" ? "" : props.initialName
  const form = useFormState({
    name: recipe?.name ?? initialName ?? "",
    brewingMethod: recipe?.brewingMethod ?? "espresso",
    defaultDoseGrams: recipe?.defaultDoseGrams ?? "",
    defaultYieldGrams: recipe?.defaultYieldGrams ?? "",
    defaultBrewTimeSeconds:
      recipe?.defaultBrewTimeSeconds === null ||
      recipe?.defaultBrewTimeSeconds === undefined
        ? ""
        : String(recipe.defaultBrewTimeSeconds),
    defaultGrindSetting: recipe?.defaultGrindSetting ?? "",
    defaultWaterTempCelsius: recipe?.defaultWaterTempCelsius ?? "",
    defaultPressure: recipe?.defaultPressure ?? "",
    notes: recipe?.notes ?? "",
  })

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.values.name.trim()) return

    setIsSubmitting(true)
    try {
      const values = {
        name: form.values.name.trim(),
        brewingMethod: form.values.brewingMethod,
        defaultDoseGrams: form.values.defaultDoseGrams || null,
        defaultYieldGrams: form.values.defaultYieldGrams || null,
        defaultBrewTimeSeconds: form.values.defaultBrewTimeSeconds
          ? Number(form.values.defaultBrewTimeSeconds)
          : null,
        defaultGrindSetting: form.values.defaultGrindSetting || null,
        defaultWaterTempCelsius:
          form.values.defaultWaterTempCelsius || null,
        defaultPressure: form.values.defaultPressure || null,
        notes: form.values.notes || null,
      }

      if (props.mode === "edit") {
        await updateRecipe({ data: { id: props.recipe.id, ...values } })
        await props.onSaved()
      } else {
        const createdRecipe = await createRecipe({ data: values })
        await props.onCreated(createdRecipe)
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save this recipe",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <EntityForm
      onSubmit={handleSubmit}
      actions={{
        onCancel: props.onCancel,
        isSubmitting,
        disabled: !form.values.name.trim(),
        submitLabel: props.mode === "edit" ? "Save Recipe" : "Add Recipe",
      }}
    >
      <FormSection
        title="Recipe"
        titleAs={props.mode === "edit" ? "h3" : "h2"}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="recipe-name"
            label="Name"
            placeholder="e.g., 18g in, 36g out"
            value={form.values.name}
            onChange={form.setField("name")}
            required
          />
          <SelectField
            id="recipe-method"
            label="Brewing method"
            value={form.values.brewingMethod}
            onChange={(value) => {
              const method = BREWING_METHOD_OPTIONS.find(
                (option) => option.value === value,
              )
              if (method) form.set("brewingMethod", method.value)
            }}
            options={BREWING_METHOD_OPTIONS}
            required
          />
        </div>
      </FormSection>

      <FormSection
        title="Defaults"
        titleAs={props.mode === "edit" ? "h3" : "h2"}
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

      <FormSection
        title="Notes"
        titleAs={props.mode === "edit" ? "h3" : "h2"}
      >
        <TextareaField
          id="recipe-notes"
          label="Notes"
          placeholder="Preparation notes or dialing-in guidance"
          value={form.values.notes}
          onChange={form.setField("notes")}
          rows={3}
        />
      </FormSection>
    </EntityForm>
  )
}
