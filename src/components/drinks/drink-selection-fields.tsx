import { DrinkTypePicker } from '@/components/drinks/drink-type-picker'
import { SelectField } from '@/components/form/form-field'
import {
  type DrinkConfiguration,
  type DrinkSelectionValues,
  optionGroupsForDrinkType,
} from '@/lib/drink-options'

export function DrinkSelectionFields({
  configuration,
  values,
  onChange,
  suggestions,
}: {
  readonly configuration: DrinkConfiguration
  readonly values: DrinkSelectionValues
  readonly onChange: (values: DrinkSelectionValues) => void
  readonly suggestions?: readonly {
    readonly id: number
    readonly name: string
  }[]
}) {
  const optionGroups = optionGroupsForDrinkType(
    configuration,
    values.drinkTypeId,
  )

  return (
    <>
      <DrinkTypePicker
        id="drinkType"
        value={values.drinkTypeId}
        drinkTypes={configuration.drinkTypes}
        suggestions={suggestions}
        onChange={(drinkTypeId) =>
          onChange({ drinkTypeId, drinkOptionValueIds: {} })
        }
      />
      {optionGroups.map((group) => (
        <SelectField
          key={group.id}
          id={`drink-option-${group.id}`}
          label={group.name}
          placeholder={`Select ${group.name.toLocaleLowerCase()}`}
          value={values.drinkOptionValueIds[String(group.id)] ?? ''}
          onChange={(value) =>
            onChange({
              ...values,
              drinkOptionValueIds: {
                ...values.drinkOptionValueIds,
                [String(group.id)]: value,
              },
            })
          }
          options={group.values.map((value) => ({
            value: String(value.id),
            label: value.name,
          }))}
        />
      ))}
    </>
  )
}
