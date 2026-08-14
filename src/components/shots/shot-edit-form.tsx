import { useState, type SyntheticEvent } from "react"
import { toast } from "sonner"
import { BeanPicker } from "@/components/beans/bean-picker"
import { SelectField } from "@/components/form/form-field"
import { TastingFields } from "@/components/form/tasting-fields"
import { EntityForm, FormSection } from "@/components/form/form-shell"
import {
  availableGearForShot,
  ShotParameterFields,
  shotFormValuesFrom,
  type ShotFormValues,
} from "@/components/shots/shot-parameter-fields"
import type { getActiveBeans } from "@/lib/server/beans"
import type { getGear } from "@/lib/server/gear"
import type { getBrewingMethods } from "@/lib/server/brewing-methods"
import { type getShot, updateShot } from "@/lib/server/shots"
import type { getTasteTags } from "@/lib/server/taste-tags"
import { shotParameterPayload } from "@/lib/new-shot-payload"
import { getShotUpdateErrors } from "@/lib/update-validation"

type Shot = NonNullable<Awaited<ReturnType<typeof getShot>>>

export type ShotEditData = {
  readonly beans: Awaited<ReturnType<typeof getActiveBeans>>
  readonly tasteTags: Awaited<ReturnType<typeof getTasteTags>>
  readonly gear: Awaited<ReturnType<typeof getGear>>
  readonly methods: Awaited<ReturnType<typeof getBrewingMethods>>
}

type ShotEditFormProps = {
  readonly shot: Shot
  readonly editData: ShotEditData
  readonly onCancel: () => void
  readonly onSaved: () => Promise<void>
}

export function ShotEditForm({ shot, editData, onCancel, onSaved }: ShotEditFormProps) {
  const [values, setValues] = useState<ShotFormValues>(() => ({
    ...shotFormValuesFrom(shot),
    rating: shot.rating ?? 0,
    notes: shot.notes ?? "",
  }))
  const [tasteTagIds, setTasteTagIds] = useState(shot.tasteTags.map((tag) => tag.tasteTagId))
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({})
  const [isSaving, setIsSaving] = useState(false)
  const set = <Key extends keyof ShotFormValues>(key: Key, value: ShotFormValues[Key]) => setValues((current) => ({ ...current, [key]: value }))

  const handleSave = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = {
      id: shot.id,
      ...shotParameterPayload(values),
      rating: values.rating || null,
      notes: values.notes || null,
      tasteTagIds,
    }
    const errors = getShotUpdateErrors(data)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSaving(true)
    try {
      await updateShot({ data })
      await onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update shot")
    } finally {
      setIsSaving(false)
    }
  }

  const positive = editData.tasteTags.filter((tag) => tag.category === "positive")
  const negative = editData.tasteTags.filter((tag) => tag.category === "negative")
  const beans = shot.bean && !editData.beans.some((bean) => bean.id === shot.bean?.id) ? [shot.bean, ...editData.beans] : editData.beans
  const selectedMethod = editData.methods.find(
    (method) => String(method.id) === values.brewingMethodId,
  )
  const methodOptions = editData.methods.map((method) => ({
    value: String(method.id),
    label: method.name,
  }))
  const gear = availableGearForShot(values, editData.gear)
  const toggleTag = (id: number) => setTasteTagIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  return (
    <EntityForm id="shot-edit-form" onSubmit={handleSave} actions={{ onCancel, isSubmitting: isSaving, submitLabel: "Save changes" }}>
      <FormSection title="Beans"><BeanPicker id="edit-bean" label="Beans" value={values.beanId} onChange={(value) => set("beanId", value ?? "")} beans={beans} autoFocus /></FormSection>
      <FormSection title="Brewing method"><SelectField id="edit-brewing-method" label="Method" value={values.brewingMethodId} options={methodOptions} onChange={(value) => set("brewingMethodId", value)} required /></FormSection>
      <ShotParameterFields values={values} gear={gear} enabledParameters={selectedMethod?.enabledParameters ?? []} errors={fieldErrors} onChange={set} />
      <TastingFields
        kind="shot"
        rating={{ value: values.rating, onChange: (rating) => set("rating", values.rating === rating ? 0 : rating) }}
        notes={{ value: values.notes, onChange: (value) => set("notes", value) }}
        tags={{ negative, positive, selectedIds: tasteTagIds, onToggle: toggleTag }}
      />
    </EntityForm>
  )
}
