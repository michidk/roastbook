import type { ReactNode } from 'react'
import { AccessoryGearPicker } from '@/components/form/accessory-gear-picker'
import { CreatableCombobox } from '@/components/form/creatable-combobox'
import { InputField, SelectField } from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import { Toggle } from '@/components/ui/toggle'
import {
  DISTRIBUTION_METHOD_OPTIONS,
  isDistributionMethod,
  PAPER_FILTER_OPTIONS,
  RATIO_BASIS_OPTIONS,
  type ShotParameterKey,
} from '@/lib/shot-parameters'
import {
  type GearOption,
  gearByEquipmentRole,
  type ShotFormValues,
} from '@/modules/brews/shot-form-values'

type ShotParameterFieldsProps = {
  readonly values: ShotFormValues
  readonly gear: readonly GearOption[]
  readonly enabledParameters: readonly string[]
  readonly equipmentPresetField?: ReactNode
  readonly useEquipmentSetupDefaults?: boolean
  readonly errors?: Readonly<Record<string, string>>
  readonly onChange: <Key extends keyof ShotFormValues>(
    key: Key,
    value: ShotFormValues[Key],
  ) => void
}

export function ShotParameterFields({
  values,
  gear,
  enabledParameters,
  equipmentPresetField,
  useEquipmentSetupDefaults = false,
  errors = {},
  onChange,
}: ShotParameterFieldsProps) {
  const show = (key: ShotParameterKey) => enabledParameters.includes(key)
  const { brewers, grinders, baskets, accessories } = gearByEquipmentRole(gear)
  const selectedGrinder = grinders.find(
    (grinder) => String(grinder.id) === values.grinderId,
  )
  const grindSettingFormat =
    selectedGrinder?.grinderDetails?.grindSettingFormat ?? 'string'
  const isNumericGrindSetting = grindSettingFormat !== 'string'
  const hasEquipment =
    Boolean(equipmentPresetField) ||
    show('machineId') ||
    show('grinderId') ||
    show('basketId') ||
    show('accessoryGearIds')
  const hasExtraction =
    show('doseGrams') ||
    show('brewWaterGrams') ||
    show('yieldGrams') ||
    show('ratioBasis') ||
    show('grindSetting') ||
    show('shotTimeSeconds') ||
    show('targetTimeSeconds') ||
    show('brewTemperatureCelsius') ||
    show('brewPressureBar') ||
    show('flowRateMlPerSecond')

  return (
    <>
      {hasEquipment ? (
        <FormSection title="Equipment">
          {equipmentPresetField}
          <div className="grid gap-4 sm:grid-cols-2">
            {show('machineId') ? (
              <CreatableCombobox
                id="shot-machine"
                label="Brewer / machine"
                value={values.machineId}
                items={brewers}
                getKey={({ id }) => id}
                getLabel={({ name }) => name}
                onChange={(value) => onChange('machineId', value)}
                placeholder="Select brewer or machine"
                searchPlaceholder="Search brewers and machines…"
                emptyMessage="No brewers or machines found."
                autoSelectSingleItem={useEquipmentSetupDefaults}
                emptyStateMessage={
                  useEquipmentSetupDefaults
                    ? 'Optional: add a brewer or espresso machine in Gear to record it here.'
                    : undefined
                }
              />
            ) : null}
            {show('grinderId') ? (
              <CreatableCombobox
                id="shot-grinder"
                label="Grinder"
                value={values.grinderId}
                items={grinders}
                getKey={({ id }) => id}
                getLabel={({ name }) => name}
                onChange={(value) => onChange('grinderId', value)}
                placeholder="Select grinder"
                searchPlaceholder="Search grinders…"
                emptyMessage="No grinders found."
                autoSelectSingleItem={useEquipmentSetupDefaults}
                emptyStateMessage={
                  useEquipmentSetupDefaults
                    ? 'Optional: add a grinder in Gear to record it here.'
                    : undefined
                }
              />
            ) : null}
            {show('basketId') ? (
              <CreatableCombobox
                id="shot-basket"
                label="Basket"
                value={values.basketId}
                items={baskets}
                getKey={({ id }) => id}
                getLabel={({ name }) => name}
                onChange={(value) => onChange('basketId', value)}
                placeholder="Select basket"
                searchPlaceholder="Search baskets…"
                emptyMessage="No baskets found."
                autoSelectSingleItem={useEquipmentSetupDefaults}
                emptyStateMessage={
                  useEquipmentSetupDefaults
                    ? 'Optional: add a basket in Gear to record it here.'
                    : undefined
                }
              />
            ) : null}
          </div>
          {show('accessoryGearIds') ? (
            <AccessoryGearPicker
              items={accessories}
              value={values.accessoryGearIds}
              onChange={(value) => onChange('accessoryGearIds', value)}
            />
          ) : null}
        </FormSection>
      ) : null}

      {hasExtraction ? (
        <FormSection title="Extraction">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {show('doseGrams') ? (
              <InputField
                id="dose"
                label="Dose"
                type="number"
                min="0"
                step="0.5"
                unit="g"
                unitPlacement="inline"
                value={values.doseGrams}
                onChange={(value) => onChange('doseGrams', value)}
                error={errors.doseGrams}
              />
            ) : null}
            {show('brewWaterGrams') ? (
              <InputField
                id="brew-water"
                label="Brew water"
                type="number"
                min="0"
                step="10"
                unit="g"
                unitPlacement="inline"
                value={values.brewWaterGrams}
                onChange={(value) => onChange('brewWaterGrams', value)}
              />
            ) : null}
            {show('yieldGrams') ? (
              <InputField
                id="yield"
                label="Yield"
                type="number"
                min="0"
                step="1"
                unit="g"
                unitPlacement="inline"
                value={values.yieldGrams}
                onChange={(value) => onChange('yieldGrams', value)}
                error={errors.yieldGrams}
              />
            ) : null}
            {show('ratioBasis') ? (
              <SelectField
                id="ratio-basis"
                label="Ratio basis"
                value={values.ratioBasis}
                options={RATIO_BASIS_OPTIONS}
                onChange={(value) =>
                  onChange(
                    'ratioBasis',
                    value === 'target_yield' || value === 'brew_water'
                      ? value
                      : '',
                  )
                }
              />
            ) : null}
            {show('grindSetting') ? (
              <InputField
                id="grind-setting"
                label="Grind setting"
                type={isNumericGrindSetting ? 'number' : 'text'}
                inputMode={isNumericGrindSetting ? 'decimal' : 'text'}
                min={
                  selectedGrinder?.grinderDetails?.grindSettingMinimum ??
                  undefined
                }
                max={
                  selectedGrinder?.grinderDetails?.grindSettingMaximum ??
                  undefined
                }
                step={grindSettingFormat === 'whole_number' ? '1' : '0.001'}
                value={values.grindSetting}
                onChange={(value) => onChange('grindSetting', value)}
                error={errors.grindSetting}
              />
            ) : null}
            {show('shotTimeSeconds') ? (
              <InputField
                id="shot-time"
                label="Brew time"
                type="number"
                min="0"
                step="1"
                unit="s"
                unitPlacement="inline"
                value={values.shotTimeSeconds}
                onChange={(value) => onChange('shotTimeSeconds', value)}
                error={errors.shotTimeSeconds}
              />
            ) : null}
            {show('targetTimeSeconds') ? (
              <InputField
                id="target-time"
                label="Target time"
                type="number"
                min="0"
                step="1"
                unit="s"
                unitPlacement="inline"
                value={values.targetTimeSeconds}
                onChange={(value) => onChange('targetTimeSeconds', value)}
                error={errors.targetTimeSeconds}
              />
            ) : null}
            {show('brewTemperatureCelsius') ? (
              <InputField
                id="temperature"
                label="Temperature"
                type="number"
                min="0"
                step="1"
                unit="°C"
                unitPlacement="inline"
                value={values.brewTemperatureCelsius}
                onChange={(value) => onChange('brewTemperatureCelsius', value)}
                error={errors.brewTemperatureCelsius}
              />
            ) : null}
            {show('brewPressureBar') ? (
              <InputField
                id="brew-pressure"
                label="Brew pressure"
                type="number"
                min="0"
                step="0.5"
                unit="bar"
                unitPlacement="inline"
                value={values.brewPressureBar}
                onChange={(value) => onChange('brewPressureBar', value)}
                error={errors.brewPressureBar}
              />
            ) : null}
            {show('flowRateMlPerSecond') ? (
              <InputField
                id="flow-rate"
                label="Flow rate"
                type="number"
                min="0"
                step="0.5"
                unit="mL/s"
                unitPlacement="inline"
                value={values.flowRateMlPerSecond}
                onChange={(value) => onChange('flowRateMlPerSecond', value)}
              />
            ) : null}
          </div>
        </FormSection>
      ) : null}

      {show('preinfusionTimeSeconds') ||
      show('preinfusionPressureBar') ||
      show('bloomTimeSeconds') ||
      show('usesPuckScreen') ||
      show('paperFilterPosition') ||
      show('distributionMethod') ||
      show('tampForceKg') ? (
        <FormSection title="Brewing method">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {show('preinfusionTimeSeconds') ? (
              <InputField
                id="preinfusion-time"
                label="Pre-infusion time"
                type="number"
                min="0"
                step="1"
                unit="s"
                unitPlacement="inline"
                value={values.preinfusionTimeSeconds}
                onChange={(value) => onChange('preinfusionTimeSeconds', value)}
              />
            ) : null}
            {show('preinfusionPressureBar') ? (
              <InputField
                id="preinfusion-pressure"
                label="Pre-infusion pressure"
                type="number"
                min="0"
                step="0.5"
                unit="bar"
                unitPlacement="inline"
                value={values.preinfusionPressureBar}
                onChange={(value) => onChange('preinfusionPressureBar', value)}
              />
            ) : null}
            {show('bloomTimeSeconds') ? (
              <InputField
                id="bloom-time"
                label="Bloom time"
                type="number"
                min="0"
                step="5"
                unit="s"
                unitPlacement="inline"
                value={values.bloomTimeSeconds}
                onChange={(value) => onChange('bloomTimeSeconds', value)}
              />
            ) : null}
            {show('paperFilterPosition') ? (
              <SelectField
                id="paper-filter"
                label="Paper filter"
                value={values.paperFilterPosition}
                options={PAPER_FILTER_OPTIONS}
                onChange={(value) =>
                  onChange(
                    'paperFilterPosition',
                    value === 'none' ||
                      value === 'top' ||
                      value === 'bottom' ||
                      value === 'both'
                      ? value
                      : '',
                  )
                }
              />
            ) : null}
            {show('distributionMethod') ? (
              <SelectField
                id="distribution"
                label="Distribution method"
                placeholder="Choose a method"
                value={values.distributionMethod}
                options={DISTRIBUTION_METHOD_OPTIONS}
                onChange={(value) => {
                  if (value === '' || isDistributionMethod(value)) {
                    onChange('distributionMethod', value)
                  }
                }}
              />
            ) : null}
            {show('tampForceKg') ? (
              <InputField
                id="tamp-force"
                label="Tamp force"
                type="number"
                min="0"
                step="1"
                unit="kg"
                unitPlacement="inline"
                value={values.tampForceKg}
                onChange={(value) => onChange('tampForceKg', value)}
              />
            ) : null}
          </div>
          {show('usesPuckScreen') ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Puck screen</legend>
              <Toggle
                variant="outline"
                className="min-h-11 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:shadow-sm hover:aria-pressed:bg-primary/90 hover:aria-pressed:text-primary-foreground"
                pressed={values.usesPuckScreen === true}
                onPressedChange={(pressed) =>
                  onChange('usesPuckScreen', pressed)
                }
              >
                Yes
              </Toggle>
            </fieldset>
          ) : null}
        </FormSection>
      ) : null}
    </>
  )
}
