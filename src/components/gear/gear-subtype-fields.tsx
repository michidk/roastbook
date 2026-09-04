import { Loader2, Search } from 'lucide-react'
import { AiActionHelp } from '@/components/ai-action-help'
import { InputField, SelectField } from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import type { GearSubtypeFormValues } from '@/components/gear/gear-form-values'
import { Button } from '@/components/ui/button'
import {
  type GearType,
  isEspressoMachineGearType,
  isGrinderGearType,
} from '@/lib/constants'
import {
  BASKET_KIND_OPTIONS,
  BOOLEAN_OPTIONS,
  BREWER_FLOW_CONTROL_OPTIONS,
  BREWER_MECHANISM_OPTIONS,
  GRINDER_ADJUSTMENT_TYPE_OPTIONS,
  GRINDER_BEAN_FEED_OPTIONS,
  GRINDER_BREW_RANGE_OPTIONS,
  GRINDER_BURR_MATERIAL_OPTIONS,
  GRINDER_BURR_MECHANISM_OPTIONS,
  GRINDER_DOSE_CONTROL_MODE_OPTIONS,
  GRINDER_GRIND_SETTING_FORMAT_OPTIONS,
  KETTLE_SPOUT_TYPE_OPTIONS,
  KETTLE_TEMPERATURE_CONTROL_OPTIONS,
  MACHINE_FLOW_CONTROL_OPTIONS,
  MACHINE_HEATING_ARCHITECTURE_OPTIONS,
  MACHINE_PREINFUSION_CONTROL_OPTIONS,
  MACHINE_PRESSURE_CONTROL_OPTIONS,
  MACHINE_PUMP_TYPE_OPTIONS,
  MACHINE_STEAM_SYSTEM_OPTIONS,
  MACHINE_TEMPERATURE_CONTROL_OPTIONS,
  MACHINE_WATER_SOURCE_OPTIONS,
  type SelectOption,
  SHOT_STOP_MODE_OPTIONS,
  TAMPER_BASE_SHAPE_OPTIONS,
  TAMPER_FORCE_CONTROL_OPTIONS,
  WDT_DEPTH_CONTROL_OPTIONS,
} from '@/lib/gear-properties'

type GearSubtypeFieldsProps = {
  readonly type: GearType | ''
  readonly values: GearSubtypeFormValues
  readonly onChange: <Key extends keyof GearSubtypeFormValues>(
    key: Key,
    value: GearSubtypeFormValues[Key],
  ) => void
  readonly idPrefix?: string
  readonly research?: {
    readonly enabled: boolean
    readonly isResearching: boolean
    readonly onResearch: () => void
    readonly disabled?: boolean
  }
}

function NullableSetField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  readonly id: string
  readonly label: string
  readonly value: readonly string[] | null
  readonly options: readonly SelectOption[]
  readonly onChange: (value: readonly string[] | null) => void
}) {
  const toggle = (option: string) => {
    const selected = new Set(value ?? [])
    if (selected.has(option)) selected.delete(option)
    else selected.add(option)
    onChange([...selected])
  }

  return (
    <fieldset id={id} className="space-y-2">
      <legend className="text-sm leading-none font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={value === null ? 'secondary' : 'outline'}
          aria-pressed={value === null}
          onClick={() => onChange(null)}
        >
          Unknown
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value?.length === 0 ? 'secondary' : 'outline'}
          aria-pressed={value?.length === 0}
          onClick={() => onChange([])}
        >
          None
        </Button>
        {options.map((option) => {
          const selected = value?.includes(option.value) ?? false
          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={selected ? 'secondary' : 'outline'}
              aria-pressed={selected}
              onClick={() => toggle(option.value)}
            >
              {option.label}
            </Button>
          )
        })}
      </div>
    </fieldset>
  )
}

const MACHINE_SETTING_KEYS = {
  owner: {
    brewPressureBar: 'ownerBrewPressureBar',
    preinfusionEnabled: 'ownerPreinfusionEnabled',
    preinfusionTimeSeconds: 'ownerPreinfusionTimeSeconds',
    preinfusionPressureBar: 'ownerPreinfusionPressureBar',
    flowLimitMlPerSecond: 'ownerFlowLimitMlPerSecond',
    brewTemperatureOffsetCelsius: 'ownerBrewTemperatureOffsetCelsius',
    programmedVolumeMl: 'ownerProgrammedVolumeMl',
    defaultStopMode: 'ownerDefaultStopMode',
    steamTemperatureCelsius: 'ownerSteamTemperatureCelsius',
    steamPressureBar: 'ownerSteamPressureBar',
  },
  factory: {
    brewPressureBar: 'factoryBrewPressureBar',
    preinfusionEnabled: 'factoryPreinfusionEnabled',
    preinfusionTimeSeconds: 'factoryPreinfusionTimeSeconds',
    preinfusionPressureBar: 'factoryPreinfusionPressureBar',
    flowLimitMlPerSecond: 'factoryFlowLimitMlPerSecond',
    brewTemperatureOffsetCelsius: 'factoryBrewTemperatureOffsetCelsius',
    programmedVolumeMl: 'factoryProgrammedVolumeMl',
    defaultStopMode: 'factoryDefaultStopMode',
    steamTemperatureCelsius: 'factorySteamTemperatureCelsius',
    steamPressureBar: 'factorySteamPressureBar',
  },
} as const

function MachineSettingFields({
  idPrefix,
  prefix,
  values,
  advanced,
  onChange,
}: {
  readonly idPrefix: string
  readonly prefix: keyof typeof MACHINE_SETTING_KEYS
  readonly values: GearSubtypeFormValues
  readonly advanced: boolean
  readonly onChange: GearSubtypeFieldsProps['onChange']
}) {
  const keys = MACHINE_SETTING_KEYS[prefix]
  const id = (field: string) => `${idPrefix}-${prefix}-${field}`

  if (!advanced) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <InputField
          id={id('brew-pressure')}
          label="Brew pressure"
          unit="bar"
          unitPlacement="inline"
          type="number"
          min="0"
          step="0.1"
          value={values[keys.brewPressureBar]}
          onChange={(value) => onChange(keys.brewPressureBar, value)}
        />
        <SelectField
          id={id('preinfusion-enabled')}
          label="Pre-infusion enabled"
          placeholder="Unknown"
          value={values[keys.preinfusionEnabled]}
          onChange={(value) => onChange(keys.preinfusionEnabled, value)}
          options={BOOLEAN_OPTIONS}
        />
        <InputField
          id={id('preinfusion-time')}
          label="Pre-infusion time"
          unit="s"
          unitPlacement="inline"
          type="number"
          min="0"
          step="0.1"
          value={values[keys.preinfusionTimeSeconds]}
          onChange={(value) => onChange(keys.preinfusionTimeSeconds, value)}
        />
        <InputField
          id={id('preinfusion-pressure')}
          label="Pre-infusion pressure"
          unit="bar"
          unitPlacement="inline"
          type="number"
          min="0"
          step="0.1"
          value={values[keys.preinfusionPressureBar]}
          onChange={(value) => onChange(keys.preinfusionPressureBar, value)}
        />
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      <InputField
        id={id('flow-limit')}
        label="Flow limit"
        unit="mL/s"
        unitPlacement="inline"
        type="number"
        min="0"
        step="0.1"
        value={values[keys.flowLimitMlPerSecond]}
        onChange={(value) => onChange(keys.flowLimitMlPerSecond, value)}
      />
      <InputField
        id={id('temperature-offset')}
        label="Brew temperature offset"
        unit="°C"
        unitPlacement="inline"
        type="number"
        step="0.1"
        value={values[keys.brewTemperatureOffsetCelsius]}
        onChange={(value) => onChange(keys.brewTemperatureOffsetCelsius, value)}
      />
      <InputField
        id={id('programmed-volume')}
        label="Programmed volume"
        unit="mL"
        unitPlacement="inline"
        type="number"
        min="0"
        step="1"
        value={values[keys.programmedVolumeMl]}
        onChange={(value) => onChange(keys.programmedVolumeMl, value)}
      />
      <SelectField
        id={id('default-stop-mode')}
        label="Default stop mode"
        placeholder="Unknown"
        value={values[keys.defaultStopMode]}
        onChange={(value) => onChange(keys.defaultStopMode, value)}
        options={SHOT_STOP_MODE_OPTIONS}
      />
      <InputField
        id={id('steam-temperature')}
        label="Steam temperature"
        unit="°C"
        unitPlacement="inline"
        type="number"
        min="0"
        step="1"
        value={values[keys.steamTemperatureCelsius]}
        onChange={(value) => onChange(keys.steamTemperatureCelsius, value)}
      />
      <InputField
        id={id('steam-pressure')}
        label="Steam pressure"
        unit="bar"
        unitPlacement="inline"
        type="number"
        min="0"
        step="0.1"
        value={values[keys.steamPressureBar]}
        onChange={(value) => onChange(keys.steamPressureBar, value)}
      />
    </div>
  )
}

function ResearchAction({
  research,
}: {
  readonly research: GearSubtypeFieldsProps['research']
}) {
  if (!research?.enabled) return null
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={research.onResearch}
        disabled={research.isResearching || research.disabled}
        aria-busy={research.isResearching}
      >
        {research.isResearching ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Search />
        )}
        {research.isResearching ? 'Researching…' : 'Research online'}
      </Button>
      <AiActionHelp>
        Finds exact-model capabilities and factory defaults with source links.
        Research never changes your current setup automatically.
      </AiActionHelp>
    </div>
  )
}

function MachineFields({
  values,
  onChange,
  idPrefix,
  research,
}: Omit<GearSubtypeFieldsProps, 'type'> & { readonly idPrefix: string }) {
  const id = (field: string) => `${idPrefix}-machine-${field}`
  return (
    <>
      <FormSection
        title="Machine capabilities"
        description="Stable product specifications. Unknown stays distinct from a documented absence."
        action={<ResearchAction research={research} />}
      >
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <InputField
            id={id('portafilter-diameter')}
            label="Portafilter diameter"
            unit="mm"
            unitPlacement="inline"
            type="number"
            min="0"
            step="0.1"
            value={values.machinePortafilterDiameterMm}
            onChange={(value) =>
              onChange('machinePortafilterDiameterMm', value)
            }
          />
          <SelectField
            id={id('heating-architecture')}
            label="Heating architecture"
            placeholder="Unknown"
            value={values.machineHeatingArchitecture}
            onChange={(value) => onChange('machineHeatingArchitecture', value)}
            options={MACHINE_HEATING_ARCHITECTURE_OPTIONS}
          />
          <SelectField
            id={id('temperature-control')}
            label="Temperature control"
            placeholder="Unknown"
            value={values.machineTemperatureControl}
            onChange={(value) => onChange('machineTemperatureControl', value)}
            options={MACHINE_TEMPERATURE_CONTROL_OPTIONS}
          />
          <SelectField
            id={id('pressure-control')}
            label="Pressure control"
            placeholder="Unknown"
            value={values.machinePressureControl}
            onChange={(value) => onChange('machinePressureControl', value)}
            options={MACHINE_PRESSURE_CONTROL_OPTIONS}
          />
          <SelectField
            id={id('flow-control')}
            label="Flow control"
            placeholder="Unknown"
            value={values.machineFlowControl}
            onChange={(value) => onChange('machineFlowControl', value)}
            options={MACHINE_FLOW_CONTROL_OPTIONS}
          />
          <SelectField
            id={id('preinfusion-control')}
            label="Pre-infusion control"
            placeholder="Unknown"
            value={values.machinePreinfusionControl}
            onChange={(value) => onChange('machinePreinfusionControl', value)}
            options={MACHINE_PREINFUSION_CONTROL_OPTIONS}
          />
          <SelectField
            id={id('steam-system')}
            label="Steam system"
            placeholder="Unknown"
            value={values.machineSteamSystem}
            onChange={(value) => onChange('machineSteamSystem', value)}
            options={MACHINE_STEAM_SYSTEM_OPTIONS}
          />
          <SelectField
            id={id('simultaneous-brew-steam')}
            label="Simultaneous brew and steam"
            placeholder="Unknown"
            value={values.machineSimultaneousBrewAndSteam}
            onChange={(value) =>
              onChange('machineSimultaneousBrewAndSteam', value)
            }
            options={BOOLEAN_OPTIONS}
          />
        </div>
        <NullableSetField
          id={id('shot-stop-modes')}
          label="Supported shot stop modes"
          value={values.machineShotStopModes}
          options={SHOT_STOP_MODE_OPTIONS}
          onChange={(value) => onChange('machineShotStopModes', value)}
        />
      </FormSection>

      <FormSection
        title="Advanced machine specifications"
        description="Documented ranges and lower-priority hardware details."
        collapsible
        defaultOpen={false}
      >
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <InputField
            id={id('group-count')}
            label="Group count"
            type="number"
            min="1"
            step="1"
            value={values.machineGroupCount}
            onChange={(value) => onChange('machineGroupCount', value)}
          />
          <SelectField
            id={id('pump-type')}
            label="Pump type"
            placeholder="Unknown"
            value={values.machinePumpType}
            onChange={(value) => onChange('machinePumpType', value)}
            options={MACHINE_PUMP_TYPE_OPTIONS}
          />
          <InputField
            id={id('pressure-minimum')}
            label="Minimum brew pressure"
            unit="bar"
            unitPlacement="inline"
            type="number"
            min="0"
            step="0.1"
            value={values.machineBrewPressureMinimumBar}
            onChange={(value) =>
              onChange('machineBrewPressureMinimumBar', value)
            }
          />
          <InputField
            id={id('pressure-maximum')}
            label="Maximum brew pressure"
            unit="bar"
            unitPlacement="inline"
            type="number"
            min="0"
            step="0.1"
            value={values.machineBrewPressureMaximumBar}
            onChange={(value) =>
              onChange('machineBrewPressureMaximumBar', value)
            }
          />
          <InputField
            id={id('temperature-minimum')}
            label="Minimum brew temperature"
            unit="°C"
            unitPlacement="inline"
            type="number"
            step="0.1"
            value={values.machineBrewTemperatureMinimumCelsius}
            onChange={(value) =>
              onChange('machineBrewTemperatureMinimumCelsius', value)
            }
          />
          <InputField
            id={id('temperature-maximum')}
            label="Maximum brew temperature"
            unit="°C"
            unitPlacement="inline"
            type="number"
            step="0.1"
            value={values.machineBrewTemperatureMaximumCelsius}
            onChange={(value) =>
              onChange('machineBrewTemperatureMaximumCelsius', value)
            }
          />
        </div>
        <NullableSetField
          id={id('water-source-modes')}
          label="Supported water sources"
          value={values.machineWaterSourceModes}
          options={MACHINE_WATER_SOURCE_OPTIONS}
          onChange={(value) => onChange('machineWaterSourceModes', value)}
        />
      </FormSection>

      <FormSection
        title="Current setup"
        description="Your current machine configuration. Saving a change creates a dated revision so old brews keep their context."
      >
        <MachineSettingFields
          idPrefix={idPrefix}
          prefix="owner"
          values={values}
          advanced={false}
          onChange={onChange}
        />
      </FormSection>
      <FormSection
        title="Advanced current setup"
        collapsible
        defaultOpen={false}
      >
        <MachineSettingFields
          idPrefix={idPrefix}
          prefix="owner"
          values={values}
          advanced
          onChange={onChange}
        />
      </FormSection>

      <FormSection
        title="Factory defaults"
        description="Documented defaults for this exact model, separate from your setup."
        collapsible
        defaultOpen={false}
      >
        <MachineSettingFields
          idPrefix={idPrefix}
          prefix="factory"
          values={values}
          advanced={false}
          onChange={onChange}
        />
        <MachineSettingFields
          idPrefix={idPrefix}
          prefix="factory"
          values={values}
          advanced
          onChange={onChange}
        />
      </FormSection>
    </>
  )
}

function GrinderFields({
  values,
  onChange,
  idPrefix,
}: Pick<GearSubtypeFieldsProps, 'values' | 'onChange'> & {
  readonly idPrefix: string
}) {
  const id = (field: string) => `${idPrefix}-grinder-${field}`
  const hasNumericGrindSettings = values.grinderGrindSettingFormat !== 'string'
  return (
    <>
      <FormSection
        title="Grinder specifications"
        description="Burr and adjustment details that affect compatibility and comparison."
      >
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <SelectField
            id={id('burr-mechanism')}
            label="Grinding mechanism"
            placeholder="Unknown"
            value={values.grinderBurrMechanism}
            onChange={(value) => onChange('grinderBurrMechanism', value)}
            options={GRINDER_BURR_MECHANISM_OPTIONS}
          />
          <InputField
            id={id('burr-diameter')}
            label="Burr diameter"
            unit="mm"
            unitPlacement="inline"
            type="number"
            min="0"
            step="0.1"
            value={values.grinderBurrDiameterMm}
            onChange={(value) => onChange('grinderBurrDiameterMm', value)}
          />
          <SelectField
            id={id('adjustment-type')}
            label="Adjustment type"
            placeholder="Unknown"
            value={values.grinderAdjustmentType}
            onChange={(value) => onChange('grinderAdjustmentType', value)}
            options={GRINDER_ADJUSTMENT_TYPE_OPTIONS}
          />
          <SelectField
            id={id('grind-setting-format')}
            label="Grind setting format"
            value={values.grinderGrindSettingFormat}
            onChange={(value) => {
              onChange('grinderGrindSettingFormat', value)
              if (value === 'string') {
                onChange('grinderGrindSettingMinimum', '')
                onChange('grinderGrindSettingMaximum', '')
              }
            }}
            options={GRINDER_GRIND_SETTING_FORMAT_OPTIONS}
          />
          <InputField
            id={id('grind-setting-minimum')}
            label="Minimum grind setting"
            type="number"
            min="0"
            step={
              values.grinderGrindSettingFormat === 'whole_number'
                ? '1'
                : '0.001'
            }
            value={values.grinderGrindSettingMinimum}
            onChange={(value) => onChange('grinderGrindSettingMinimum', value)}
            disabled={!hasNumericGrindSettings}
          />
          <InputField
            id={id('grind-setting-maximum')}
            label="Maximum grind setting"
            type="number"
            min="0"
            step={
              values.grinderGrindSettingFormat === 'whole_number'
                ? '1'
                : '0.001'
            }
            value={values.grinderGrindSettingMaximum}
            onChange={(value) => onChange('grinderGrindSettingMaximum', value)}
            disabled={!hasNumericGrindSettings}
          />
        </div>
        <NullableSetField
          id={id('brew-range')}
          label="Supported brew range"
          value={values.grinderBrewRange}
          options={GRINDER_BREW_RANGE_OPTIONS}
          onChange={(value) => onChange('grinderBrewRange', value)}
        />
      </FormSection>
      <FormSection
        title="Advanced grinder specifications"
        collapsible
        defaultOpen={false}
      >
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <SelectField
            id={id('bean-feed')}
            label="Bean feed"
            placeholder="Unknown"
            value={values.grinderBeanFeed}
            onChange={(value) => onChange('grinderBeanFeed', value)}
            options={GRINDER_BEAN_FEED_OPTIONS}
          />
          <SelectField
            id={id('burr-material')}
            label="Burr material"
            placeholder="Unknown"
            value={values.grinderBurrMaterial}
            onChange={(value) => onChange('grinderBurrMaterial', value)}
            options={GRINDER_BURR_MATERIAL_OPTIONS}
          />
        </div>
        <NullableSetField
          id={id('dose-control-modes')}
          label="Dose control modes"
          value={values.grinderDoseControlModes}
          options={GRINDER_DOSE_CONTROL_MODE_OPTIONS}
          onChange={(value) => onChange('grinderDoseControlModes', value)}
        />
      </FormSection>
    </>
  )
}

export function GearSubtypeFields({
  type,
  values,
  onChange,
  research,
  idPrefix = 'gear',
}: GearSubtypeFieldsProps) {
  const id = (field: string) => `${idPrefix}-${field}`

  if (isEspressoMachineGearType(type) || isGrinderGearType(type)) {
    return (
      <>
        {isEspressoMachineGearType(type) ? (
          <MachineFields
            values={values}
            onChange={onChange}
            idPrefix={idPrefix}
            research={research}
          />
        ) : null}
        {isGrinderGearType(type) ? (
          <GrinderFields
            values={values}
            onChange={onChange}
            idPrefix={idPrefix}
          />
        ) : null}
      </>
    )
  }

  if (type === 'brewer') {
    return (
      <>
        <FormSection title="Brewer specifications">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <SelectField
              id={id('brewer-mechanism')}
              label="Brewing mechanism"
              placeholder="Unknown"
              value={values.brewerMechanism}
              onChange={(value) => onChange('brewerMechanism', value)}
              options={BREWER_MECHANISM_OPTIONS}
            />
            <InputField
              id={id('brewer-capacity')}
              label="Capacity"
              unit="mL"
              unitPlacement="inline"
              type="number"
              min="0"
              step="1"
              value={values.brewerCapacityMl}
              onChange={(value) => onChange('brewerCapacityMl', value)}
            />
            <InputField
              id={id('brewer-filter-format')}
              label="Filter format"
              placeholder="e.g., 02 or AeroPress"
              value={values.brewerFilterFormat}
              onChange={(value) => onChange('brewerFilterFormat', value)}
            />
          </div>
        </FormSection>
        <FormSection
          title="Advanced brewer specifications"
          collapsible
          defaultOpen={false}
        >
          <SelectField
            id={id('brewer-flow-control')}
            label="Flow control"
            placeholder="Unknown"
            value={values.brewerFlowControl}
            onChange={(value) => onChange('brewerFlowControl', value)}
            options={BREWER_FLOW_CONTROL_OPTIONS}
          />
        </FormSection>
      </>
    )
  }

  if (type === 'kettle') {
    return (
      <>
        <FormSection title="Kettle specifications">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <InputField
              id={id('kettle-capacity')}
              label="Capacity"
              unit="mL"
              unitPlacement="inline"
              type="number"
              min="0"
              step="1"
              value={values.kettleCapacityMl}
              onChange={(value) => onChange('kettleCapacityMl', value)}
            />
            <SelectField
              id={id('kettle-spout-type')}
              label="Spout type"
              placeholder="Unknown"
              value={values.kettleSpoutType}
              onChange={(value) => onChange('kettleSpoutType', value)}
              options={KETTLE_SPOUT_TYPE_OPTIONS}
            />
            <SelectField
              id={id('kettle-temperature-control')}
              label="Temperature control"
              placeholder="Unknown"
              value={values.kettleTemperatureControl}
              onChange={(value) => onChange('kettleTemperatureControl', value)}
              options={KETTLE_TEMPERATURE_CONTROL_OPTIONS}
            />
          </div>
        </FormSection>
        <FormSection
          title="Advanced kettle specifications"
          collapsible
          defaultOpen={false}
        >
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <InputField
              id={id('kettle-temperature-minimum')}
              label="Minimum temperature"
              unit="°C"
              unitPlacement="inline"
              type="number"
              min="0"
              step="0.1"
              value={values.kettleMinimumTemperatureCelsius}
              onChange={(value) =>
                onChange('kettleMinimumTemperatureCelsius', value)
              }
            />
            <InputField
              id={id('kettle-temperature-maximum')}
              label="Maximum temperature"
              unit="°C"
              unitPlacement="inline"
              type="number"
              min="0"
              step="0.1"
              value={values.kettleMaximumTemperatureCelsius}
              onChange={(value) =>
                onChange('kettleMaximumTemperatureCelsius', value)
              }
            />
            <SelectField
              id={id('kettle-temperature-hold')}
              label="Temperature hold"
              placeholder="Unknown"
              value={values.kettleSupportsTemperatureHold}
              onChange={(value) =>
                onChange('kettleSupportsTemperatureHold', value)
              }
              options={BOOLEAN_OPTIONS}
            />
          </div>
        </FormSection>
      </>
    )
  }

  if (type === 'scale') {
    return (
      <>
        <FormSection title="Scale specifications">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <InputField
              id={id('scale-resolution')}
              label="Resolution"
              unit="g"
              unitPlacement="inline"
              type="number"
              min="0"
              step="0.001"
              value={values.scaleResolutionGrams}
              onChange={(value) => onChange('scaleResolutionGrams', value)}
            />
            <InputField
              id={id('scale-capacity')}
              label="Capacity"
              unit="g"
              unitPlacement="inline"
              type="number"
              min="0"
              step="1"
              value={values.scaleCapacityGrams}
              onChange={(value) => onChange('scaleCapacityGrams', value)}
            />
            <SelectField
              id={id('scale-timer')}
              label="Built-in timer"
              placeholder="Unknown"
              value={values.scaleHasTimer}
              onChange={(value) => onChange('scaleHasTimer', value)}
              options={BOOLEAN_OPTIONS}
            />
          </div>
        </FormSection>
        <FormSection
          title="Advanced scale specifications"
          collapsible
          defaultOpen={false}
        >
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <SelectField
              id={id('scale-auto-tare')}
              label="Auto tare"
              placeholder="Unknown"
              value={values.scaleSupportsAutoTare}
              onChange={(value) => onChange('scaleSupportsAutoTare', value)}
              options={BOOLEAN_OPTIONS}
            />
            <SelectField
              id={id('scale-auto-timer')}
              label="Automatic timer"
              placeholder="Unknown"
              value={values.scaleSupportsAutoTimer}
              onChange={(value) => onChange('scaleSupportsAutoTimer', value)}
              options={BOOLEAN_OPTIONS}
            />
            <SelectField
              id={id('scale-flow-rate')}
              label="Flow-rate display"
              placeholder="Unknown"
              value={values.scaleHasFlowRateDisplay}
              onChange={(value) => onChange('scaleHasFlowRateDisplay', value)}
              options={BOOLEAN_OPTIONS}
            />
          </div>
        </FormSection>
      </>
    )
  }

  if (type === 'tamper') {
    return (
      <>
        <FormSection
          title="Tamper specifications"
          description="Every field is optional; leave a value blank when it is unknown."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id={id('tamper-diameter')}
              label="Base diameter"
              unit="mm"
              unitPlacement="inline"
              type="number"
              min="0"
              step="0.1"
              value={values.tamperDiameterMm}
              onChange={(value) => onChange('tamperDiameterMm', value)}
            />
            <SelectField
              id={id('tamper-force-control')}
              label="Force control"
              placeholder="Unknown"
              value={values.tamperForceControl}
              onChange={(value) => onChange('tamperForceControl', value)}
              options={TAMPER_FORCE_CONTROL_OPTIONS}
            />
          </div>
        </FormSection>
        <FormSection
          title="Advanced tamper specifications"
          collapsible
          defaultOpen={false}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id={id('tamper-base-shape')}
              label="Base shape"
              placeholder="Unknown"
              value={values.tamperBaseShape}
              onChange={(value) => onChange('tamperBaseShape', value)}
              options={TAMPER_BASE_SHAPE_OPTIONS}
            />
            <SelectField
              id={id('tamper-self-leveling')}
              label="Self-leveling"
              placeholder="Unknown"
              value={values.tamperSelfLeveling}
              onChange={(value) => onChange('tamperSelfLeveling', value)}
              options={BOOLEAN_OPTIONS}
            />
          </div>
        </FormSection>
      </>
    )
  }

  if (type === 'wdt') {
    return (
      <>
        <FormSection title="WDT specifications">
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id={id('wdt-needle-diameter')}
              label="Needle diameter"
              unit="mm"
              unitPlacement="inline"
              type="number"
              min="0"
              step="0.01"
              value={values.wdtNeedleDiameterMm}
              onChange={(value) => onChange('wdtNeedleDiameterMm', value)}
            />
            <InputField
              id={id('wdt-needle-count')}
              label="Needle count"
              type="number"
              min="1"
              step="1"
              value={values.wdtNeedleCount}
              onChange={(value) => onChange('wdtNeedleCount', value)}
            />
          </div>
        </FormSection>
        <FormSection
          title="Advanced WDT specifications"
          collapsible
          defaultOpen={false}
        >
          <SelectField
            id={id('wdt-depth-control')}
            label="Depth control"
            placeholder="Unknown"
            value={values.wdtDepthControl}
            onChange={(value) => onChange('wdtDepthControl', value)}
            options={WDT_DEPTH_CONTROL_OPTIONS}
          />
        </FormSection>
      </>
    )
  }

  if (type === 'basket') {
    return (
      <>
        <FormSection title="Basket specifications">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <InputField
              id={id('basket-diameter')}
              label="Diameter"
              unit="mm"
              unitPlacement="inline"
              type="number"
              min="0"
              step="0.1"
              value={values.basketDiameterMm}
              onChange={(value) => onChange('basketDiameterMm', value)}
            />
            <InputField
              id={id('basket-nominal-dose')}
              label="Nominal dose"
              unit="g"
              unitPlacement="inline"
              type="number"
              min="0"
              step="0.1"
              value={values.basketNominalDoseGrams}
              onChange={(value) => onChange('basketNominalDoseGrams', value)}
            />
            <SelectField
              id={id('basket-pressurized')}
              label="Pressurized / dual wall"
              placeholder="Unknown"
              value={values.basketIsPressurized}
              onChange={(value) => onChange('basketIsPressurized', value)}
              options={BOOLEAN_OPTIONS}
            />
          </div>
        </FormSection>
        <FormSection
          title="Advanced basket specifications"
          collapsible
          defaultOpen={false}
        >
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <InputField
              id={id('basket-dose-minimum')}
              label="Minimum dose"
              unit="g"
              unitPlacement="inline"
              type="number"
              min="0"
              step="0.1"
              value={values.basketDoseMinimumGrams}
              onChange={(value) => onChange('basketDoseMinimumGrams', value)}
            />
            <InputField
              id={id('basket-dose-maximum')}
              label="Maximum dose"
              unit="g"
              unitPlacement="inline"
              type="number"
              min="0"
              step="0.1"
              value={values.basketDoseMaximumGrams}
              onChange={(value) => onChange('basketDoseMaximumGrams', value)}
            />
            <SelectField
              id={id('basket-kind')}
              label="Basket kind"
              placeholder="Unknown"
              value={values.basketKind}
              onChange={(value) => onChange('basketKind', value)}
              options={BASKET_KIND_OPTIONS}
            />
          </div>
        </FormSection>
      </>
    )
  }

  return null
}
