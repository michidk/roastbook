import { AccessoryGearPicker } from '@/components/form/accessory-gear-picker'
import { CreatableCombobox } from '@/components/form/creatable-combobox'
import { InputField, TextareaField } from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import {
  availableGearForShot,
  type GearOption,
  gearByEquipmentRole,
} from '@/modules/brews/shot-form-values'
import type { GearSetFormValues } from './gear-set-form-values'

type GearSetFieldsProps = {
  readonly idPrefix: string
  readonly values: GearSetFormValues
  readonly gear: readonly GearOption[]
  readonly onChange: <Key extends keyof GearSetFormValues>(
    key: Key,
    value: GearSetFormValues[Key],
  ) => void
}

export function GearSetFields({
  idPrefix,
  values,
  gear,
  onChange,
}: GearSetFieldsProps) {
  const { brewers, grinders, baskets, accessories } = gearByEquipmentRole(
    availableGearForShot(values, gear),
  )

  return (
    <>
      <FormSection title="Gear set">
        <InputField
          id={`${idPrefix}-name`}
          label="Name"
          value={values.name}
          onChange={(value) => onChange('name', value)}
          placeholder="Work"
          required
        />
        <TextareaField
          id={`${idPrefix}-description`}
          label="Description"
          value={values.description}
          onChange={(value) => onChange('description', value)}
          placeholder="The equipment I use at the office"
          rows={2}
        />
      </FormSection>
      <FormSection
        title="Equipment"
        description="Loading this set into a brew fills these equipment fields."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <CreatableCombobox
            id={`${idPrefix}-machine`}
            label="Brewer / machine"
            value={values.machineId}
            items={brewers}
            getKey={({ id }) => id}
            getLabel={({ name }) => name}
            onChange={(value) => onChange('machineId', value)}
            placeholder="Select brewer or machine"
            searchPlaceholder="Search brewers and machines…"
            emptyMessage="No brewers or machines found."
          />
          <CreatableCombobox
            id={`${idPrefix}-grinder`}
            label="Grinder"
            value={values.grinderId}
            items={grinders}
            getKey={({ id }) => id}
            getLabel={({ name }) => name}
            onChange={(value) => onChange('grinderId', value)}
            placeholder="Select grinder"
            searchPlaceholder="Search grinders…"
            emptyMessage="No grinders found."
          />
          <CreatableCombobox
            id={`${idPrefix}-basket`}
            label="Basket"
            value={values.basketId}
            items={baskets}
            getKey={({ id }) => id}
            getLabel={({ name }) => name}
            onChange={(value) => onChange('basketId', value)}
            placeholder="Select basket"
            searchPlaceholder="Search baskets…"
            emptyMessage="No baskets found."
          />
        </div>
        <AccessoryGearPicker
          items={accessories}
          value={values.accessoryGearIds}
          onChange={(value) => onChange('accessoryGearIds', value)}
          label="Accessories"
        />
      </FormSection>
    </>
  )
}
