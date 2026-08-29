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
}: {
  readonly configuration: DrinkConfiguration
  readonly values: DrinkSelectionValues
  readonly onChange: (values: DrinkSelectionValues) => void
}) {
  const optionGroups = optionGroupsForDrinkType(
    configuration,
    values.drinkTypeId,
  )

  return (
    <>
      <SelectField
        id="drinkType"
        label="Drink type"
        placeholder="Select type"
        value={values.drinkTypeId}
        onChange={(drinkTypeId) =>
          onChange({ drinkTypeId, drinkOptionValueIds: {} })
        }
        options={configuration.drinkTypes.map((type) => ({
          value: String(type.id),
          label: type.name,
        }))}
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
