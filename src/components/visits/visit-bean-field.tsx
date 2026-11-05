import { BeanFields } from '@/components/beans/bean-fields'
import {
  type BeanFormValues,
  createEmptyBeanFormValues,
} from '@/components/beans/bean-form-values'
import { BeanLibraryFields } from '@/components/beans/bean-library-fields'
import { CreatableCombobox } from '@/components/form/creatable-combobox'
import { EntityImageUploadSection } from '@/components/form/entity-image-upload-section'
import { InputField } from '@/components/form/form-field'
import {
  type RoasterOption,
  RoasterPicker,
} from '@/components/roasters/roaster-picker'
import { Button } from '@/components/ui/button'
import type { useImageUpload } from '@/hooks/use-image-upload'
import type { getBeans } from '@/journal/beans'

export function VisitBeanField({
  beans,
  roasters,
  value,
  onChange,
  draft,
  onDraftChange,
  upload,
}: {
  beans: Awaited<ReturnType<typeof getBeans>>
  roasters: readonly RoasterOption[]
  value: string
  onChange: (value: string) => void
  draft: BeanFormValues | null
  onDraftChange: (value: BeanFormValues | null) => void
  upload: ReturnType<typeof useImageUpload>
}) {
  if (!draft)
    return (
      <CreatableCombobox
        id="visit-bean"
        label="Coffee (optional)"
        value={value}
        onChange={onChange}
        items={beans}
        getKey={(bean) => bean.id}
        getLabel={(bean) => bean.name}
        getDescription={(bean) => bean.roasterRef?.name ?? bean.roaster}
        placeholder="Search your coffee database"
        searchPlaceholder="Coffee name…"
        onCreateRequest={(name) => {
          onChange('')
          onDraftChange({
            ...createEmptyBeanFormValues(name),
            createBag: false,
          })
        }}
        createLabel={(name) => `Add “${name}” as a new coffee`}
        emptyMessage="No coffees yet. Type a name to add one."
      />
    )
  const set = <Key extends keyof BeanFormValues>(
    key: Key,
    value: BeanFormValues[Key],
  ) => onDraftChange({ ...draft, [key]: value })
  return (
    <div className="space-y-4 rounded-lg border p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">New coffee</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDraftChange(null)}
        >
          Use an existing coffee
        </Button>
      </div>
      <InputField
        id="visit-bean-name"
        label="Coffee name"
        value={draft.name}
        onChange={(value) => set('name', value)}
        required
      />
      <RoasterPicker
        id="visit-bean-roaster"
        label="Roaster (optional)"
        value={draft.roasterId}
        onChange={(value) => set('roasterId', value)}
        roasters={roasters}
      />
      <p className="text-sm text-muted-foreground">
        Saved with this visit. No bag or shelf entry unless you choose one
        below.
      </p>
      <details className="space-y-4">
        <summary className="min-h-11 cursor-pointer py-2 font-medium">
          More coffee details
        </summary>
        <BeanLibraryFields
          values={draft}
          onChange={set}
          idPrefix="visit-coffee"
          allowBagCreation
        />
        <BeanFields
          values={draft}
          onChange={set}
          roasters={roasters}
          idPrefix="visit-coffee"
          showPurchaseFields={draft.createBag}
          showLibraryFields={false}
          showBasicInfo={false}
        />
        <EntityImageUploadSection
          upload={upload}
          prompt="Add coffee pictures"
          previewAltPrefix="Coffee"
        />
      </details>
    </div>
  )
}
