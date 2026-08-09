import { useMemo, useState, type SyntheticEvent } from "react"
import { toast } from "sonner"
import { BeanPicker } from "@/components/beans/bean-picker"
import { CreatableCombobox } from "@/components/form/creatable-combobox"
import { InputField, SelectField, TextareaField } from "@/components/form/form-field"
import { EntityForm, FormSection } from "@/components/form/form-shell"
import { Toggle } from "@/components/ui/toggle"
import {
  PAPER_FILTER_OPTIONS,
  RATIO_BASIS_OPTIONS,
  RECIPE_FIELD_KEYS,
  RECIPE_FIELD_META,
  type RecipeFieldKey,
  type RecipeValues,
} from "@/lib/recipe-fields"
import { BEGINNER_RECIPE_PRESETS, getRecipePreset } from "@/lib/recipe-presets"
import { BREWING_METHOD_OPTIONS } from "@/lib/recipes"
import {
  createRecipe,
  getRecipe,
  updateRecipe,
  type RecipeMutation,
} from "@/lib/server/recipes"

type Recipe = NonNullable<Awaited<ReturnType<typeof getRecipe>>>
type Option = { readonly id: number; readonly name: string }

type RecipeFormProps = {
  readonly mode?: "create" | "edit"
  readonly recipe?: Recipe
  readonly beans?: readonly Option[]
  readonly grinders?: readonly Option[]
  readonly baskets?: readonly Option[]
  readonly accessories?: readonly Option[]
  readonly initialName?: string
  readonly requireBean?: boolean
  readonly onCreated?: (recipe: NonNullable<Awaited<ReturnType<typeof createRecipe>>>) => void | Promise<void>
  readonly onSaved?: () => void | Promise<void>
  readonly onCancel: () => void
}

const EMPTY_VALUES: RecipeValues = {
  name: "",
  brewingMethod: "espresso",
  beanId: null,
  targetDoseGrams: null,
  brewWaterGrams: null,
  ratioBasis: null,
  grinderId: null,
  grindSetting: null,
  targetYieldGrams: null,
  targetTimeMinSeconds: null,
  targetTimeMaxSeconds: null,
  brewTemperatureCelsius: null,
  preinfusionTimeSeconds: null,
  preinfusionPressureBar: null,
  bloomTimeSeconds: null,
  targetBrewPressureBar: null,
  targetFlowRateMlPerSecond: null,
  basketId: null,
  usesPuckScreen: null,
  paperFilterPosition: null,
  distributionMethod: null,
  tampForceKg: null,
  notes: null,
  enabledFields: ["bean", "target_dose", "target_yield", "target_time", "notes"],
}

function valuesFromRecipe(recipe: Recipe | undefined, initialName: string): RecipeValues {
  if (!recipe) return { ...EMPTY_VALUES, name: initialName }
  return {
    name: recipe.name,
    brewingMethod: recipe.brewingMethod,
    beanId: recipe.beanId,
    targetDoseGrams: recipe.targetDoseGrams,
    brewWaterGrams: recipe.brewWaterGrams,
    ratioBasis: recipe.ratioBasis === "target_yield" || recipe.ratioBasis === "brew_water" ? recipe.ratioBasis : null,
    grinderId: recipe.grinderId,
    grindSetting: recipe.grindSetting,
    targetYieldGrams: recipe.targetYieldGrams,
    targetTimeMinSeconds: recipe.targetTimeMinSeconds,
    targetTimeMaxSeconds: recipe.targetTimeMaxSeconds,
    brewTemperatureCelsius: recipe.brewTemperatureCelsius,
    preinfusionTimeSeconds: recipe.preinfusionTimeSeconds,
    preinfusionPressureBar: recipe.preinfusionPressureBar,
    bloomTimeSeconds: recipe.bloomTimeSeconds,
    targetBrewPressureBar: recipe.targetBrewPressureBar,
    targetFlowRateMlPerSecond: recipe.targetFlowRateMlPerSecond,
    basketId: recipe.basketId,
    usesPuckScreen: recipe.usesPuckScreen,
    paperFilterPosition:
      recipe.paperFilterPosition === "none" || recipe.paperFilterPosition === "top" || recipe.paperFilterPosition === "bottom" || recipe.paperFilterPosition === "both"
        ? recipe.paperFilterPosition
        : null,
    distributionMethod: recipe.distributionMethod,
    tampForceKg: recipe.tampForceKg,
    notes: recipe.notes,
    enabledFields: recipe.enabledFields
      .map(({ fieldKey }) => fieldKey)
      .filter((fieldKey): fieldKey is RecipeFieldKey => RECIPE_FIELD_KEYS.some((key) => key === fieldKey)),
  }
}

export function RecipeForm({
  mode = "create",
  recipe,
  beans = [],
  grinders = [],
  baskets = [],
  accessories = [],
  initialName = "",
  requireBean = false,
  onCreated,
  onSaved,
  onCancel,
}: RecipeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [values, setValues] = useState(() => valuesFromRecipe(recipe, initialName))
  const [accessoryIds, setAccessoryIds] = useState<readonly number[]>(
    recipe?.gear.map(({ gearId }) => gearId) ?? [],
  )
  const enabled = useMemo(() => new Set(values.enabledFields), [values.enabledFields])
  const set = <Key extends keyof RecipeValues>(key: Key, value: RecipeValues[Key]) =>
    setValues((current) => ({ ...current, [key]: value }))
  const setText = (key: keyof RecipeValues) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value || null }))

  const applyPreset = (presetId: string) => {
    const preset = getRecipePreset(presetId)
    if (!preset) return
    setValues({
      ...EMPTY_VALUES,
      ...preset.values,
      name: preset.name,
      brewingMethod: preset.brewingMethod,
      enabledFields: preset.enabledFields,
    })
    setAccessoryIds([])
  }

  const setFieldEnabled = (fieldKey: RecipeFieldKey, isEnabled: boolean) => {
    setValues((current) => ({
      ...current,
      enabledFields: isEnabled
        ? [...current.enabledFields, fieldKey]
        : current.enabledFields.filter((key) => key !== fieldKey),
    }))
  }

  const hasPreparationContext = enabled.has("grinder")
    || enabled.has("grind_setting")
    || enabled.has("basket")
    || enabled.has("paper_filter")
    || enabled.has("distribution_method")
    || enabled.has("accessories")

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!values.name.trim() || (requireBean && !values.beanId)) return
    const mutation: RecipeMutation = {
      ...values,
      name: values.name.trim(),
      accessoryIds: enabled.has("accessories") ? accessoryIds : [],
    }
    setIsSubmitting(true)
    try {
      if (mode === "edit" && recipe) {
        await updateRecipe({ data: { id: recipe.id, ...mutation } })
        await onSaved?.()
      } else {
        const created = await createRecipe({ data: mutation })
        if (created) await onCreated?.(created)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this recipe")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <EntityForm
      onSubmit={handleSubmit}
      actions={{ onCancel, isSubmitting, disabled: !values.name.trim() || (requireBean && !values.beanId), submitLabel: mode === "edit" ? "Save Recipe" : "Add Recipe" }}
    >
      {mode === "create" ? (
        <FormSection title="Start with a recipe" description="Choose a guided starting point or customize every field.">
          <SelectField id="recipe-preset" label="Beginner preset" placeholder="Blank custom recipe" value="" onChange={applyPreset} options={BEGINNER_RECIPE_PRESETS.map(({ id, name }) => ({ value: id, label: name }))} />
        </FormSection>
      ) : null}

      <FormSection title="Recipe identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField id="recipe-name" label="Name" value={values.name} onChange={(value) => set("name", value)} required />
          <SelectField id="recipe-method" label="Brewing method" value={values.brewingMethod} onChange={(value) => {
            const method = BREWING_METHOD_OPTIONS.find((option) => option.value === value)
            if (method) set("brewingMethod", method.value)
          }} options={BREWING_METHOD_OPTIONS} required />
        </div>
        {enabled.has("bean") ? <BeanPicker id="recipe-bean" label="Coffee / bean" value={values.beanId ? String(values.beanId) : ""} onChange={(value) => set("beanId", value ? Number(value) : null)} beans={beans} required={requireBean} /> : null}
      </FormSection>

      <FormSection title="Fields used by this recipe" description="These choices also control which measurements appear while logging a brew.">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {RECIPE_FIELD_KEYS.map((fieldKey) => (
            <Toggle
              key={fieldKey}
              type="button"
              variant="outline"
              pressed={enabled.has(fieldKey)}
              onPressedChange={(isPressed) => setFieldEnabled(fieldKey, isPressed)}
              className="h-auto min-h-11 justify-start rounded-xl px-3 text-left font-semibold whitespace-normal aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {RECIPE_FIELD_META[fieldKey].label}
            </Toggle>
          ))}
        </div>
      </FormSection>

      <FormSection title="Brew targets">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {enabled.has("target_dose") ? <InputField id="recipe-dose" label="Target dose (g)" type="number" min="0" step="0.01" value={values.targetDoseGrams ?? ""} onChange={setText("targetDoseGrams")} /> : null}
          {enabled.has("brew_water") ? <InputField id="recipe-water" label="Brew water (g)" type="number" min="0" step="0.01" value={values.brewWaterGrams ?? ""} onChange={setText("brewWaterGrams")} /> : null}
          {enabled.has("target_yield") ? <InputField id="recipe-yield" label="Target yield (g)" type="number" min="0" step="0.01" value={values.targetYieldGrams ?? ""} onChange={setText("targetYieldGrams")} /> : null}
          {enabled.has("brew_ratio") ? <SelectField id="recipe-ratio-basis" label="Ratio basis" value={values.ratioBasis ?? ""} onChange={(value) => set("ratioBasis", value === "target_yield" || value === "brew_water" ? value : null)} options={RATIO_BASIS_OPTIONS} /> : null}
          {enabled.has("target_time") ? <><InputField id="recipe-time-min" label="Target time min (s)" type="number" min="0" step="0.01" value={values.targetTimeMinSeconds ?? ""} onChange={setText("targetTimeMinSeconds")} /><InputField id="recipe-time-max" label="Target time max (s)" type="number" min="0" step="0.01" value={values.targetTimeMaxSeconds ?? ""} onChange={setText("targetTimeMaxSeconds")} /></> : null}
          {enabled.has("brew_temperature") ? <InputField id="recipe-temperature" label="Brew temperature (°C)" type="number" min="0" step="0.1" value={values.brewTemperatureCelsius ?? ""} onChange={setText("brewTemperatureCelsius")} /> : null}
          {enabled.has("bloom_time") ? <InputField id="recipe-bloom" label="Bloom time (s)" type="number" min="0" step="0.01" value={values.bloomTimeSeconds ?? ""} onChange={setText("bloomTimeSeconds")} /> : null}
          {enabled.has("target_pressure") ? <InputField id="recipe-pressure" label="Target pressure (bar)" type="number" min="0" step="0.01" value={values.targetBrewPressureBar ?? ""} onChange={setText("targetBrewPressureBar")} /> : null}
          {enabled.has("target_flow_rate") ? <InputField id="recipe-flow" label="Target flow (mL/s)" type="number" min="0" step="0.01" value={values.targetFlowRateMlPerSecond ?? ""} onChange={setText("targetFlowRateMlPerSecond")} /> : null}
          {enabled.has("preinfusion_time") ? <InputField id="recipe-preinfusion-time" label="Pre-infusion time (s)" type="number" min="0" step="0.01" value={values.preinfusionTimeSeconds ?? ""} onChange={setText("preinfusionTimeSeconds")} /> : null}
          {enabled.has("preinfusion_pressure") ? <InputField id="recipe-preinfusion-pressure" label="Pre-infusion pressure (bar)" type="number" min="0" step="0.01" value={values.preinfusionPressureBar ?? ""} onChange={setText("preinfusionPressureBar")} /> : null}
          {enabled.has("tamp_force") ? <InputField id="recipe-tamp" label="Tamp force (kg)" type="number" min="0" step="0.01" value={values.tampForceKg ?? ""} onChange={setText("tampForceKg")} /> : null}
        </div>
      </FormSection>

      {hasPreparationContext ? (
        <FormSection title="Preparation context">
          <div className="grid gap-4 sm:grid-cols-2">
            {enabled.has("grinder") ? <CreatableCombobox id="recipe-grinder" label="Grinder" value={values.grinderId ? String(values.grinderId) : ""} onChange={(value) => set("grinderId", value ? Number(value) : null)} items={grinders} getKey={({ id }) => id} getLabel={({ name }) => name} placeholder="Select grinder" searchPlaceholder="Search grinders…" emptyMessage="No grinders found." /> : null}
            {enabled.has("grind_setting") ? <InputField id="recipe-grind" label="Grind setting" value={values.grindSetting ?? ""} onChange={setText("grindSetting")} /> : null}
            {enabled.has("basket") ? <CreatableCombobox id="recipe-basket" label="Basket" value={values.basketId ? String(values.basketId) : ""} onChange={(value) => set("basketId", value ? Number(value) : null)} items={baskets} getKey={({ id }) => id} getLabel={({ name }) => name} placeholder="Select basket" searchPlaceholder="Search baskets…" emptyMessage="No baskets found." /> : null}
            {enabled.has("paper_filter") ? <SelectField id="recipe-filter" label="Paper filter position" value={values.paperFilterPosition ?? ""} onChange={(value) => {
              const option = PAPER_FILTER_OPTIONS.find(({ value: optionValue }) => optionValue === value)
              set("paperFilterPosition", option?.value ?? null)
            }} options={PAPER_FILTER_OPTIONS} /> : null}
            {enabled.has("distribution_method") ? <InputField id="recipe-distribution" label="Distribution method" value={values.distributionMethod ?? ""} onChange={setText("distributionMethod")} /> : null}
          </div>
          {enabled.has("accessories") ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {accessories.map((item) => {
                const isSelected = accessoryIds.includes(item.id)
                return (
                  <Toggle
                    key={item.id}
                    type="button"
                    variant="outline"
                    pressed={isSelected}
                    onPressedChange={(isPressed) => setAccessoryIds((current) => isPressed
                      ? [...current, item.id]
                      : current.filter((id) => id !== item.id))}
                    className="h-auto min-h-11 justify-start rounded-xl px-3 text-left font-semibold whitespace-normal aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {item.name}
                  </Toggle>
                )
              })}
            </div>
          ) : null}
        </FormSection>
      ) : null}

      {enabled.has("notes") ? <FormSection title="Notes"><TextareaField id="recipe-notes" label="Preparation notes" value={values.notes ?? ""} onChange={setText("notes")} rows={4} /></FormSection> : null}
    </EntityForm>
  )
}
