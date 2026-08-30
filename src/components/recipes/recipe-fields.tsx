import type { ReactNode } from 'react'
import { BeanPicker } from '@/components/beans/bean-picker'
import { InputField, SelectField } from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import { ShotParameterFields } from '@/components/shots/shot-parameter-fields'
import type { getActiveBeans } from '@/lib/server/beans'
import type { getBrewingMethods } from '@/lib/server/brewing-methods'
import type { getGear } from '@/lib/server/gear'
import {
  availableGearForShot,
  type ShotFormValues,
} from '@/modules/brews/shot-form-values'

type RecipeFieldsProps = {
  readonly name: string
  readonly values: ShotFormValues
  readonly beans: Awaited<ReturnType<typeof getActiveBeans>>
  readonly methods: Awaited<ReturnType<typeof getBrewingMethods>>
  readonly gear: Awaited<ReturnType<typeof getGear>>
  readonly equipmentPresetField?: ReactNode
  readonly errors?: Readonly<Record<string, string>>
  readonly onNameChange: (name: string) => void
  readonly onChange: <Key extends keyof ShotFormValues>(
    key: Key,
    value: ShotFormValues[Key],
  ) => void
}

export function RecipeFields({
  name,
  values,
  beans,
  methods,
  gear,
  equipmentPresetField,
  errors = {},
  onNameChange,
  onChange,
}: RecipeFieldsProps) {
  const selectedMethod = methods.find(
    (method) => String(method.id) === values.brewingMethodId,
  )
  const methodOptions = methods.map((method) => ({
    value: String(method.id),
    label: method.name,
  }))

  return (
    <>
      <FormSection
        title="Brewing method"
        description="Choose the method first. It controls which recipe fields are available."
      >
        <SelectField
          id="recipe-method"
          label="Method"
          placeholder="Choose a brewing method"
          value={values.brewingMethodId}
          options={methodOptions}
          onChange={(value) => onChange('brewingMethodId', value)}
          required
          error={errors.brewingMethodId}
        />
      </FormSection>

      {selectedMethod ? (
        <>
          <FormSection title="Recipe">
            <InputField
              id="recipe-name"
              label="Name"
              value={name}
              onChange={onNameChange}
              required
              autoFocus
              error={errors.name}
            />
          </FormSection>
          <FormSection title="Beans">
            <BeanPicker
              id="recipe-bean"
              label="Beans"
              value={values.beanId}
              onChange={(value) => onChange('beanId', value)}
              beans={beans}
            />
          </FormSection>
          <ShotParameterFields
            values={values}
            gear={availableGearForShot(values, gear)}
            enabledParameters={selectedMethod.enabledParameters}
            equipmentPresetField={equipmentPresetField}
            errors={errors}
            onChange={onChange}
          />
        </>
      ) : null}
    </>
  )
}
