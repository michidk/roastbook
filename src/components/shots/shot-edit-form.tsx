import { useState, type SyntheticEvent } from "react"
import { toast } from "sonner"
import { EntityForm, FormSection } from "@/components/form/form-shell"
import { InputField } from "@/components/form/form-field"
import { CreatableCombobox } from "@/components/form/creatable-combobox"
import { BeanPicker } from "@/components/beans/bean-picker"
import { TastingFields } from "@/components/form/tasting-fields"
import { useFormState } from "@/hooks/use-form-state"
import { getActiveBeans } from "@/lib/server/beans"
import { getRecipes } from "@/lib/server/recipes"
import { getShot, updateShot } from "@/lib/server/shots"
import { getTasteTags } from "@/lib/server/taste-tags"
import { toNullableRating, toRatingInput } from "@/lib/rating"
import { getShotUpdateErrors } from "@/lib/update-validation"

type Shot = NonNullable<Awaited<ReturnType<typeof getShot>>>

export type ShotEditData = {
  readonly beans: Awaited<ReturnType<typeof getActiveBeans>>
  readonly recipes: Awaited<ReturnType<typeof getRecipes>>
  readonly tasteTags: Awaited<ReturnType<typeof getTasteTags>>
}

type ShotEditFormProps = {
  readonly shot: Shot
  readonly editData: ShotEditData
  readonly onCancel: () => void
  readonly onSaved: () => Promise<void>
}

export function ShotEditForm({
  shot,
  editData,
  onCancel,
  onSaved,
}: ShotEditFormProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<
    Readonly<Record<string, string>>
  >({})
  const form = useFormState(() => ({
    beanId: shot.beanId ? String(shot.beanId) : "",
    recipeId: shot.recipeId ? String(shot.recipeId) : "",
    doseGrams: shot.doseGrams ?? "",
    yieldGrams: shot.yieldGrams ?? "",
    brewTimeSeconds:
      shot.brewTimeSeconds !== null && shot.brewTimeSeconds !== undefined
        ? String(shot.brewTimeSeconds)
        : "",
    grindSetting: shot.grindSetting ?? "",
    waterTempCelsius: shot.waterTempCelsius ?? "",
    pressure: shot.pressure ?? "",
    rating: toRatingInput(shot.rating),
    notes: shot.notes ?? "",
    tasteTagIds: shot.tasteTags.map((tag) => tag.tasteTagId),
  }))

  const negativeTags = editData.tasteTags.filter(
    (tag) => tag.category === "negative"
  )
  const positiveTags = editData.tasteTags.filter(
    (tag) => tag.category === "positive"
  )
  const beanOptions =
    shot.bean && !editData.beans.some((bean) => bean.id === shot.bean?.id)
      ? [shot.bean, ...editData.beans]
      : editData.beans
  const recipeOptions =
    shot.recipe &&
    !editData.recipes.some((recipe) => recipe.id === shot.recipe?.id)
      ? [shot.recipe, ...editData.recipes]
      : editData.recipes

  const toggleTag = (tagId: number) => {
    form.set(
      "tasteTagIds",
      form.values.tasteTagIds.includes(tagId)
        ? form.values.tasteTagIds.filter((id) => id !== tagId)
        : [...form.values.tasteTagIds, tagId]
    )
  }

  const handleSave = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const updateData = {
      id: shot.id,
      beanId: form.values.beanId ? Number(form.values.beanId) : null,
      recipeId: form.values.recipeId ? Number(form.values.recipeId) : null,
      doseGrams: form.values.doseGrams || null,
      yieldGrams: form.values.yieldGrams || null,
      brewTimeSeconds: form.values.brewTimeSeconds
        ? Number(form.values.brewTimeSeconds)
        : null,
      grindSetting: form.values.grindSetting || null,
      waterTempCelsius: form.values.waterTempCelsius || null,
      pressure: form.values.pressure || null,
      rating: toNullableRating(form.values.rating),
      notes: form.values.notes || null,
      tasteTagIds: form.values.tasteTagIds,
    }
    const errors = getShotUpdateErrors(updateData)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSaving(true)
    try {
      await updateShot({ data: updateData })
      await onSaved()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update shot"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <EntityForm
      id="shot-edit-form"
      onSubmit={handleSave}
      actions={{ onCancel, isSubmitting: isSaving, submitLabel: "Save Changes" }}
    >
      <FormSection title="Beans">
        <BeanPicker
          id="bean"
          label="Select Beans"
          value={form.values.beanId}
          onChange={form.setField("beanId")}
          beans={beanOptions}
          autoFocus
        />
      </FormSection>

      <FormSection title="Recipe">
        <CreatableCombobox
          id="recipe"
          label="Select Recipe"
          value={form.values.recipeId}
          onChange={form.setField("recipeId")}
          items={recipeOptions}
          getKey={(recipe) => recipe.id}
          getLabel={(recipe) => recipe.name}
          placeholder="Select recipe"
          searchPlaceholder="Search recipes…"
          emptyMessage="No matching recipes."
        />
      </FormSection>

      <FormSection title="Extraction">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <InputField
            id="dose"
            label="Dose (g)"
            inputMode="decimal"
            placeholder="18.0"
            value={form.values.doseGrams}
            onChange={form.setField("doseGrams")}
            error={fieldErrors.doseGrams}
          />
          <InputField
            id="yield"
            label="Yield (g)"
            inputMode="decimal"
            placeholder="36.0"
            value={form.values.yieldGrams}
            onChange={form.setField("yieldGrams")}
            error={fieldErrors.yieldGrams}
          />
          <InputField
            id="grindSetting"
            label="Grind Setting"
            placeholder="e.g., 15"
            value={form.values.grindSetting}
            onChange={form.setField("grindSetting")}
          />
        </div>
        <InputField
          id="brewTime"
          label="Brew Time (seconds)"
          inputMode="numeric"
          placeholder="30"
          value={form.values.brewTimeSeconds}
          onChange={(value) =>
            form.set("brewTimeSeconds", value.replace(/[^0-9]/g, ""))
          }
          error={fieldErrors.brewTimeSeconds}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="temp"
            label="Water Temp (°C)"
            inputMode="decimal"
            placeholder="93.0"
            value={form.values.waterTempCelsius}
            onChange={form.setField("waterTempCelsius")}
            error={fieldErrors.waterTempCelsius}
          />
          <InputField
            id="pressure"
            label="Pressure (bar)"
            inputMode="decimal"
            placeholder="9.0"
            value={form.values.pressure}
            onChange={form.setField("pressure")}
            error={fieldErrors.pressure}
          />
        </div>
      </FormSection>

      <TastingFields
        kind="shot"
        rating={{ value: form.values.rating, onChange: (rating) => form.set("rating", form.values.rating === rating ? 0 : rating) }}
        notes={{ value: form.values.notes, onChange: form.setField("notes") }}
        tags={{ negative: negativeTags, positive: positiveTags, selectedIds: form.values.tasteTagIds, onToggle: toggleTag }}
      />

    </EntityForm>
  )
}
