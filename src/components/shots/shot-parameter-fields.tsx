import { CreatableCombobox } from '@/components/form/creatable-combobox'
import { InputField, SelectField } from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import { Toggle } from '@/components/ui/toggle'
import { isEspressoMachineGearType, isGrinderGearType } from '@/lib/constants'
import {
  DISTRIBUTION_METHOD_OPTIONS,
  PAPER_FILTER_OPTIONS,
  type PaperFilterPosition,
  RATIO_BASIS_OPTIONS,
  type RatioBasis,
  type ShotParameterKey,
  type ShotParameterValues,
} from '@/lib/shot-parameters'

export type ShotFormValues = {
  brewingMethodId: string
  beanId: string
  machineId: string
  doseGrams: string
  brewWaterGrams: string
  ratioBasis: RatioBasis | ''
  grinderId: string
  grindSetting: string
  yieldGrams: string
  shotTimeSeconds: string
  brewTemperatureCelsius: string
  preinfusionTimeSeconds: string
  preinfusionPressureBar: string
  bloomTimeSeconds: string
  brewPressureBar: string
  flowRateMlPerSecond: string
  basketId: string
  usesPuckScreen: boolean | null
  paperFilterPosition: PaperFilterPosition | ''
  distributionMethod: string
  tampForceKg: string
  accessoryGearIds: number[]
  rating: number
  bitterness: number
  acidity: number
  sweetness: number
  body: number
  astringency: number
  notes: string
}

export const EMPTY_SHOT_FORM_VALUES: ShotFormValues = {
  brewingMethodId: '',
  beanId: '',
  machineId: '',
  doseGrams: '',
  brewWaterGrams: '',
  ratioBasis: '',
  grinderId: '',
  grindSetting: '',
  yieldGrams: '',
  shotTimeSeconds: '',
  brewTemperatureCelsius: '',
  preinfusionTimeSeconds: '',
  preinfusionPressureBar: '',
  bloomTimeSeconds: '',
  brewPressureBar: '',
  flowRateMlPerSecond: '',
  basketId: '',
  usesPuckScreen: null,
  paperFilterPosition: '',
  distributionMethod: '',
  tampForceKg: '',
  accessoryGearIds: [],
  rating: 0,
  bitterness: 0,
  acidity: 0,
  sweetness: 0,
  body: 0,
  astringency: 0,
  notes: '',
}

type ShotParameterSource = Omit<
  ShotParameterValues,
  'ratioBasis' | 'paperFilterPosition'
> & {
  readonly ratioBasis: string | null
  readonly paperFilterPosition: string | null
}

export function shotFormValuesFrom(
  source: ShotParameterSource,
): ShotFormValues {
  return {
    ...EMPTY_SHOT_FORM_VALUES,
    brewingMethodId: String(source.brewingMethodId),
    beanId: source.beanId ? String(source.beanId) : '',
    machineId: source.machineId ? String(source.machineId) : '',
    doseGrams: source.doseGrams ?? '',
    brewWaterGrams: source.brewWaterGrams ?? '',
    ratioBasis:
      source.ratioBasis === 'target_yield' || source.ratioBasis === 'brew_water'
        ? source.ratioBasis
        : '',
    grinderId: source.grinderId ? String(source.grinderId) : '',
    grindSetting: source.grindSetting ?? '',
    yieldGrams: source.yieldGrams ?? '',
    shotTimeSeconds: source.shotTimeSeconds ?? '',
    brewTemperatureCelsius: source.brewTemperatureCelsius ?? '',
    preinfusionTimeSeconds: source.preinfusionTimeSeconds ?? '',
    preinfusionPressureBar: source.preinfusionPressureBar ?? '',
    bloomTimeSeconds: source.bloomTimeSeconds ?? '',
    brewPressureBar: source.brewPressureBar ?? '',
    flowRateMlPerSecond: source.flowRateMlPerSecond ?? '',
    basketId: source.basketId ? String(source.basketId) : '',
    usesPuckScreen: source.usesPuckScreen,
    paperFilterPosition:
      source.paperFilterPosition === 'none' ||
      source.paperFilterPosition === 'top' ||
      source.paperFilterPosition === 'bottom' ||
      source.paperFilterPosition === 'both'
        ? source.paperFilterPosition
        : '',
    distributionMethod: source.distributionMethod ?? '',
    tampForceKg: source.tampForceKg ?? '',
    accessoryGearIds: [...source.accessoryGearIds],
  }
}

type GearOption = {
  readonly id: number
  readonly name: string
  readonly type: string
  readonly isArchived?: boolean
}

export function availableGearForShot(
  values: ShotFormValues,
  gear: readonly GearOption[],
): GearOption[] {
  const selectedIds = new Set([
    values.machineId,
    values.grinderId,
    values.basketId,
    ...values.accessoryGearIds.map(String),
  ])
  return gear.filter(
    (item) => !item.isArchived || selectedIds.has(String(item.id)),
  )
}

type ShotParameterFieldsProps = {
  readonly values: ShotFormValues
  readonly gear: readonly GearOption[]
  readonly enabledParameters: readonly string[]
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
  useEquipmentSetupDefaults = false,
  errors = {},
  onChange,
}: ShotParameterFieldsProps) {
  const show = (key: ShotParameterKey) => enabledParameters.includes(key)
  const brewers = gear.filter(
    (item) => isEspressoMachineGearType(item.type) || item.type === 'brewer',
  )
  const grinders = gear.filter((item) => isGrinderGearType(item.type))
  const baskets = gear.filter((item) => item.type === 'basket')
  const distributionMethodOptions = DISTRIBUTION_METHOD_OPTIONS.some(
    (option) => option.value === values.distributionMethod,
  )
    ? DISTRIBUTION_METHOD_OPTIONS
    : values.distributionMethod
      ? [
          {
            value: values.distributionMethod,
            label: values.distributionMethod,
          },
          ...DISTRIBUTION_METHOD_OPTIONS,
        ]
      : DISTRIBUTION_METHOD_OPTIONS
  const accessories = gear.filter(
    (item) =>
      !isEspressoMachineGearType(item.type) &&
      !isGrinderGearType(item.type) &&
      item.type !== 'brewer' &&
      item.type !== 'basket',
  )
  const hasExtraction =
    show('doseGrams') ||
    show('brewWaterGrams') ||
    show('yieldGrams') ||
    show('ratioBasis') ||
    show('grindSetting') ||
    show('shotTimeSeconds') ||
    show('brewTemperatureCelsius') ||
    show('brewPressureBar') ||
    show('flowRateMlPerSecond')

  return (
    <>
      {show('machineId') ||
      show('grinderId') ||
      show('basketId') ||
      show('accessoryGearIds') ? (
        <FormSection title="Equipment">
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
            <div className="flex flex-wrap gap-2">
              {accessories.map((item) => (
                <Toggle
                  key={item.id}
                  variant="outline"
                  className="min-h-11"
                  pressed={values.accessoryGearIds.includes(item.id)}
                  onPressedChange={(pressed) =>
                    onChange(
                      'accessoryGearIds',
                      pressed
                        ? [...values.accessoryGearIds, item.id]
                        : values.accessoryGearIds.filter(
                            (id) => id !== item.id,
                          ),
                    )
                  }
                >
                  {item.name}
                </Toggle>
              ))}
            </div>
          ) : null}
        </FormSection>
      ) : null}

      {hasExtraction ? (
        <FormSection title="Extraction">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {show('doseGrams') ? (
              <InputField
                id="dose"
                label="Dose (g)"
                type="number"
                min="0"
                step="0.5"
                value={values.doseGrams}
                onChange={(value) => onChange('doseGrams', value)}
                error={errors.doseGrams}
              />
            ) : null}
            {show('brewWaterGrams') ? (
              <InputField
                id="brew-water"
                label="Brew water (g)"
                type="number"
                min="0"
                step="10"
                value={values.brewWaterGrams}
                onChange={(value) => onChange('brewWaterGrams', value)}
              />
            ) : null}
            {show('yieldGrams') ? (
              <InputField
                id="yield"
                label="Yield (g)"
                type="number"
                min="0"
                step="1"
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
                value={values.grindSetting}
                onChange={(value) => onChange('grindSetting', value)}
              />
            ) : null}
            {show('shotTimeSeconds') ? (
              <InputField
                id="shot-time"
                label="Brew time (s)"
                type="number"
                min="0"
                step="1"
                value={values.shotTimeSeconds}
                onChange={(value) => onChange('shotTimeSeconds', value)}
                error={errors.shotTimeSeconds}
              />
            ) : null}
            {show('brewTemperatureCelsius') ? (
              <InputField
                id="temperature"
                label="Temperature (°C)"
                type="number"
                min="0"
                step="1"
                value={values.brewTemperatureCelsius}
                onChange={(value) => onChange('brewTemperatureCelsius', value)}
                error={errors.brewTemperatureCelsius}
              />
            ) : null}
            {show('brewPressureBar') ? (
              <InputField
                id="brew-pressure"
                label="Brew pressure (bar)"
                type="number"
                min="0"
                step="0.5"
                value={values.brewPressureBar}
                onChange={(value) => onChange('brewPressureBar', value)}
                error={errors.brewPressureBar}
              />
            ) : null}
            {show('flowRateMlPerSecond') ? (
              <InputField
                id="flow-rate"
                label="Flow rate (mL/s)"
                type="number"
                min="0"
                step="0.5"
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
        <FormSection title="Technique">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {show('preinfusionTimeSeconds') ? (
              <InputField
                id="preinfusion-time"
                label="Pre-infusion time (s)"
                type="number"
                min="0"
                step="1"
                value={values.preinfusionTimeSeconds}
                onChange={(value) => onChange('preinfusionTimeSeconds', value)}
              />
            ) : null}
            {show('preinfusionPressureBar') ? (
              <InputField
                id="preinfusion-pressure"
                label="Pre-infusion pressure (bar)"
                type="number"
                min="0"
                step="0.5"
                value={values.preinfusionPressureBar}
                onChange={(value) => onChange('preinfusionPressureBar', value)}
              />
            ) : null}
            {show('bloomTimeSeconds') ? (
              <InputField
                id="bloom-time"
                label="Bloom time (s)"
                type="number"
                min="0"
                step="5"
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
                options={distributionMethodOptions}
                onChange={(value) => onChange('distributionMethod', value)}
              />
            ) : null}
            {show('tampForceKg') ? (
              <InputField
                id="tamp-force"
                label="Tamp force (kg)"
                type="number"
                min="0"
                step="1"
                value={values.tampForceKg}
                onChange={(value) => onChange('tampForceKg', value)}
              />
            ) : null}
          </div>
          {show('usesPuckScreen') ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Puck screen</legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { label: 'Not recorded', value: null },
                    { label: 'No', value: false },
                    { label: 'Yes', value: true },
                  ] as const
                ).map((option) => (
                  <Toggle
                    key={option.label}
                    variant="outline"
                    className="min-h-11 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:shadow-sm hover:aria-pressed:bg-primary/90 hover:aria-pressed:text-primary-foreground"
                    pressed={values.usesPuckScreen === option.value}
                    onPressedChange={() =>
                      onChange('usesPuckScreen', option.value)
                    }
                  >
                    {option.label}
                  </Toggle>
                ))}
              </div>
            </fieldset>
          ) : null}
        </FormSection>
      ) : null}
    </>
  )
}
