import { isCurrency } from '@/lib/app-settings'
import {
  type GearType,
  isEspressoMachineGearType,
  isGrinderGearType,
} from '@/lib/constants'
import {
  AUTO_STOP_MODE_VALUES,
  BASKET_KIND_VALUES,
  BREWER_FLOW_CONTROL_VALUES,
  BREWER_MECHANISM_VALUES,
  GRINDER_ADJUSTMENT_TYPE_VALUES,
  GRINDER_BEAN_FEED_VALUES,
  GRINDER_BREW_RANGE_VALUES,
  GRINDER_BURR_MATERIAL_VALUES,
  GRINDER_BURR_MECHANISM_VALUES,
  GRINDER_DOSE_CONTROL_MODE_VALUES,
  KETTLE_SPOUT_TYPE_VALUES,
  KETTLE_TEMPERATURE_CONTROL_VALUES,
  MACHINE_FLOW_CONTROL_VALUES,
  MACHINE_HEATING_ARCHITECTURE_VALUES,
  MACHINE_PREINFUSION_CONTROL_VALUES,
  MACHINE_PRESSURE_CONTROL_VALUES,
  MACHINE_PUMP_TYPE_VALUES,
  MACHINE_STEAM_SYSTEM_VALUES,
  MACHINE_TEMPERATURE_CONTROL_VALUES,
  MACHINE_WATER_SOURCE_VALUES,
  TAMPER_BASE_SHAPE_VALUES,
  TAMPER_FORCE_CONTROL_VALUES,
  WDT_DEPTH_CONTROL_VALUES,
} from '@/lib/domain-contracts'
import { DomainError } from '@/lib/domain-errors'
import { currentMachineSettingRevision } from '@/lib/gear-properties'
import type {
  BasketDetailsInput,
  BrewerDetailsInput,
  EspressoMachineDetailsInput,
  EspressoMachineSettingsInput,
  GearPropertyEvidenceInput,
  GrinderDetailsInput,
  KettleDetailsInput,
  ScaleDetailsInput,
  TamperDetailsInput,
  WdtDetailsInput,
} from '@/lib/gear-property-schemas'

type NullableStringSet = readonly string[] | null

export type GearSubtypeFormValues = {
  readonly machinePortafilterDiameterMm: string
  readonly machineHeatingArchitecture: string
  readonly machineTemperatureControl: string
  readonly machinePressureControl: string
  readonly machineFlowControl: string
  readonly machinePreinfusionControl: string
  readonly machineShotStopModes: NullableStringSet
  readonly machineSteamSystem: string
  readonly machineSimultaneousBrewAndSteam: string
  readonly machineGroupCount: string
  readonly machinePumpType: string
  readonly machineWaterSourceModes: NullableStringSet
  readonly machineBrewPressureMinimumBar: string
  readonly machineBrewPressureMaximumBar: string
  readonly machineBrewTemperatureMinimumCelsius: string
  readonly machineBrewTemperatureMaximumCelsius: string
  readonly ownerBrewPressureBar: string
  readonly ownerPreinfusionEnabled: string
  readonly ownerPreinfusionTimeSeconds: string
  readonly ownerPreinfusionPressureBar: string
  readonly ownerFlowLimitMlPerSecond: string
  readonly ownerBrewTemperatureOffsetCelsius: string
  readonly ownerProgrammedVolumeMl: string
  readonly ownerDefaultStopMode: string
  readonly ownerSteamTemperatureCelsius: string
  readonly ownerSteamPressureBar: string
  readonly factoryBrewPressureBar: string
  readonly factoryPreinfusionEnabled: string
  readonly factoryPreinfusionTimeSeconds: string
  readonly factoryPreinfusionPressureBar: string
  readonly factoryFlowLimitMlPerSecond: string
  readonly factoryBrewTemperatureOffsetCelsius: string
  readonly factoryProgrammedVolumeMl: string
  readonly factoryDefaultStopMode: string
  readonly factorySteamTemperatureCelsius: string
  readonly factorySteamPressureBar: string
  readonly grinderBurrMechanism: string
  readonly grinderBurrDiameterMm: string
  readonly grinderAdjustmentType: string
  readonly grinderBrewRange: NullableStringSet
  readonly grinderBeanFeed: string
  readonly grinderDoseControlModes: NullableStringSet
  readonly grinderBurrMaterial: string
  readonly brewerMechanism: string
  readonly brewerCapacityMl: string
  readonly brewerFilterFormat: string
  readonly brewerFlowControl: string
  readonly kettleCapacityMl: string
  readonly kettleSpoutType: string
  readonly kettleTemperatureControl: string
  readonly kettleMinimumTemperatureCelsius: string
  readonly kettleMaximumTemperatureCelsius: string
  readonly kettleSupportsTemperatureHold: string
  readonly scaleResolutionGrams: string
  readonly scaleCapacityGrams: string
  readonly scaleHasTimer: string
  readonly scaleSupportsAutoTare: string
  readonly scaleSupportsAutoTimer: string
  readonly scaleHasFlowRateDisplay: string
  readonly tamperDiameterMm: string
  readonly tamperForceControl: string
  readonly tamperBaseShape: string
  readonly tamperSelfLeveling: string
  readonly wdtNeedleDiameterMm: string
  readonly wdtNeedleCount: string
  readonly wdtDepthControl: string
  readonly basketNominalDoseGrams: string
  readonly basketDiameterMm: string
  readonly basketIsPressurized: string
  readonly basketDoseMinimumGrams: string
  readonly basketDoseMaximumGrams: string
  readonly basketKind: string
}

export type GearFormValues = GearSubtypeFormValues & {
  readonly brand: string
  readonly model: string
  readonly type: GearType | ''
  readonly purchaseDate: string
  readonly purchasePrice: string
  readonly priceCurrency: string
  readonly manualUrl: string
  readonly productUrl: string
  readonly notes: string
  readonly propertyEvidence: readonly GearPropertyEvidenceInput[]
}

export const EMPTY_GEAR_SUBTYPE_VALUES: GearSubtypeFormValues = {
  machinePortafilterDiameterMm: '',
  machineHeatingArchitecture: '',
  machineTemperatureControl: '',
  machinePressureControl: '',
  machineFlowControl: '',
  machinePreinfusionControl: '',
  machineShotStopModes: null,
  machineSteamSystem: '',
  machineSimultaneousBrewAndSteam: '',
  machineGroupCount: '',
  machinePumpType: '',
  machineWaterSourceModes: null,
  machineBrewPressureMinimumBar: '',
  machineBrewPressureMaximumBar: '',
  machineBrewTemperatureMinimumCelsius: '',
  machineBrewTemperatureMaximumCelsius: '',
  ownerBrewPressureBar: '',
  ownerPreinfusionEnabled: '',
  ownerPreinfusionTimeSeconds: '',
  ownerPreinfusionPressureBar: '',
  ownerFlowLimitMlPerSecond: '',
  ownerBrewTemperatureOffsetCelsius: '',
  ownerProgrammedVolumeMl: '',
  ownerDefaultStopMode: '',
  ownerSteamTemperatureCelsius: '',
  ownerSteamPressureBar: '',
  factoryBrewPressureBar: '',
  factoryPreinfusionEnabled: '',
  factoryPreinfusionTimeSeconds: '',
  factoryPreinfusionPressureBar: '',
  factoryFlowLimitMlPerSecond: '',
  factoryBrewTemperatureOffsetCelsius: '',
  factoryProgrammedVolumeMl: '',
  factoryDefaultStopMode: '',
  factorySteamTemperatureCelsius: '',
  factorySteamPressureBar: '',
  grinderBurrMechanism: '',
  grinderBurrDiameterMm: '',
  grinderAdjustmentType: '',
  grinderBrewRange: null,
  grinderBeanFeed: '',
  grinderDoseControlModes: null,
  grinderBurrMaterial: '',
  brewerMechanism: '',
  brewerCapacityMl: '',
  brewerFilterFormat: '',
  brewerFlowControl: '',
  kettleCapacityMl: '',
  kettleSpoutType: '',
  kettleTemperatureControl: '',
  kettleMinimumTemperatureCelsius: '',
  kettleMaximumTemperatureCelsius: '',
  kettleSupportsTemperatureHold: '',
  scaleResolutionGrams: '',
  scaleCapacityGrams: '',
  scaleHasTimer: '',
  scaleSupportsAutoTare: '',
  scaleSupportsAutoTimer: '',
  scaleHasFlowRateDisplay: '',
  tamperDiameterMm: '',
  tamperForceControl: '',
  tamperBaseShape: '',
  tamperSelfLeveling: '',
  wdtNeedleDiameterMm: '',
  wdtNeedleCount: '',
  wdtDepthControl: '',
  basketNominalDoseGrams: '',
  basketDiameterMm: '',
  basketIsPressurized: '',
  basketDoseMinimumGrams: '',
  basketDoseMaximumGrams: '',
  basketKind: '',
}

type WidenPersistedValue<TValue> = TValue extends string
  ? string
  : TValue extends readonly string[]
    ? readonly string[]
    : TValue

type PersistedDetailSource<TValues> = {
  readonly [TKey in keyof TValues]: WidenPersistedValue<TValues[TKey]>
}

type MachineSettingSource =
  PersistedDetailSource<EspressoMachineSettingsInput> & {
    readonly kind: string
    readonly supersededAt: Date | string | null
  }

type GearFormValueSource = {
  readonly brand: string | null
  readonly model: string | null
  readonly type: GearType
  readonly purchaseDate: Date | string | null
  readonly purchasePrice: string | null
  readonly priceCurrency: string | null
  readonly manualUrl: string | null
  readonly productUrl: string | null
  readonly notes: string | null
  readonly espressoMachineDetails?: PersistedDetailSource<EspressoMachineDetailsInput> | null
  readonly machineSettingRevisions?: readonly MachineSettingSource[]
  readonly grinderDetails?: PersistedDetailSource<GrinderDetailsInput> | null
  readonly brewerDetails?: PersistedDetailSource<BrewerDetailsInput> | null
  readonly kettleDetails?: PersistedDetailSource<KettleDetailsInput> | null
  readonly scaleDetails?: PersistedDetailSource<ScaleDetailsInput> | null
  readonly tamperDetails?: PersistedDetailSource<TamperDetailsInput> | null
  readonly wdtDetails?: PersistedDetailSource<WdtDetailsInput> | null
  readonly basketDetails?: PersistedDetailSource<BasketDetailsInput> | null
}

function dateForInput(date: Date | string | null | undefined) {
  if (!date) return ''
  const parsedDate = new Date(date)
  return Number.isNaN(parsedDate.getTime())
    ? ''
    : (parsedDate.toISOString().split('T', 1)[0] ?? '')
}

function valueForInput(value: string | number | null | undefined) {
  return value == null ? '' : String(value)
}

function booleanForInput(value: boolean | null | undefined) {
  return value == null ? '' : String(value)
}

function setForInput(values: readonly string[] | null | undefined) {
  return values === null || values === undefined ? null : [...values]
}

export function createEmptyGearFormValues(): GearFormValues {
  return {
    brand: '',
    model: '',
    type: '',
    purchaseDate: '',
    purchasePrice: '',
    priceCurrency: 'EUR',
    manualUrl: '',
    productUrl: '',
    notes: '',
    propertyEvidence: [],
    ...EMPTY_GEAR_SUBTYPE_VALUES,
  }
}

export function gearFormValuesFrom(
  gear?: GearFormValueSource | null,
): GearFormValues {
  if (!gear) return createEmptyGearFormValues()
  const machine = gear.espressoMachineDetails
  const owner = currentMachineSettingRevision(
    gear.machineSettingRevisions,
    'owner',
  )
  const factory = currentMachineSettingRevision(
    gear.machineSettingRevisions,
    'factory',
  )
  const grinder = gear.grinderDetails
  const brewer = gear.brewerDetails
  const kettle = gear.kettleDetails
  const scale = gear.scaleDetails
  const tamper = gear.tamperDetails
  const wdt = gear.wdtDetails
  const basket = gear.basketDetails

  return {
    brand: gear.brand ?? '',
    model: gear.model ?? '',
    type: gear.type,
    purchaseDate: dateForInput(gear.purchaseDate),
    purchasePrice: gear.purchasePrice ?? '',
    priceCurrency: gear.priceCurrency ?? 'EUR',
    manualUrl: gear.manualUrl ?? '',
    productUrl: gear.productUrl ?? '',
    notes: gear.notes ?? '',
    propertyEvidence: [],
    machinePortafilterDiameterMm: valueForInput(machine?.portafilterDiameterMm),
    machineHeatingArchitecture: machine?.heatingArchitecture ?? '',
    machineTemperatureControl: machine?.temperatureControl ?? '',
    machinePressureControl: machine?.pressureControl ?? '',
    machineFlowControl: machine?.flowControl ?? '',
    machinePreinfusionControl: machine?.preinfusionControl ?? '',
    machineShotStopModes: setForInput(machine?.shotStopModes),
    machineSteamSystem: machine?.steamSystem ?? '',
    machineSimultaneousBrewAndSteam: booleanForInput(
      machine?.simultaneousBrewAndSteam,
    ),
    machineGroupCount: valueForInput(machine?.groupCount),
    machinePumpType: machine?.pumpType ?? '',
    machineWaterSourceModes: setForInput(machine?.waterSourceModes),
    machineBrewPressureMinimumBar: valueForInput(
      machine?.brewPressureMinimumBar,
    ),
    machineBrewPressureMaximumBar: valueForInput(
      machine?.brewPressureMaximumBar,
    ),
    machineBrewTemperatureMinimumCelsius: valueForInput(
      machine?.brewTemperatureMinimumCelsius,
    ),
    machineBrewTemperatureMaximumCelsius: valueForInput(
      machine?.brewTemperatureMaximumCelsius,
    ),
    ownerBrewPressureBar: valueForInput(owner?.brewPressureBar),
    ownerPreinfusionEnabled: booleanForInput(owner?.preinfusionEnabled),
    ownerPreinfusionTimeSeconds: valueForInput(owner?.preinfusionTimeSeconds),
    ownerPreinfusionPressureBar: valueForInput(owner?.preinfusionPressureBar),
    ownerFlowLimitMlPerSecond: valueForInput(owner?.flowLimitMlPerSecond),
    ownerBrewTemperatureOffsetCelsius: valueForInput(
      owner?.brewTemperatureOffsetCelsius,
    ),
    ownerProgrammedVolumeMl: valueForInput(owner?.programmedVolumeMl),
    ownerDefaultStopMode: owner?.defaultStopMode ?? '',
    ownerSteamTemperatureCelsius: valueForInput(owner?.steamTemperatureCelsius),
    ownerSteamPressureBar: valueForInput(owner?.steamPressureBar),
    factoryBrewPressureBar: valueForInput(factory?.brewPressureBar),
    factoryPreinfusionEnabled: booleanForInput(factory?.preinfusionEnabled),
    factoryPreinfusionTimeSeconds: valueForInput(
      factory?.preinfusionTimeSeconds,
    ),
    factoryPreinfusionPressureBar: valueForInput(
      factory?.preinfusionPressureBar,
    ),
    factoryFlowLimitMlPerSecond: valueForInput(factory?.flowLimitMlPerSecond),
    factoryBrewTemperatureOffsetCelsius: valueForInput(
      factory?.brewTemperatureOffsetCelsius,
    ),
    factoryProgrammedVolumeMl: valueForInput(factory?.programmedVolumeMl),
    factoryDefaultStopMode: factory?.defaultStopMode ?? '',
    factorySteamTemperatureCelsius: valueForInput(
      factory?.steamTemperatureCelsius,
    ),
    factorySteamPressureBar: valueForInput(factory?.steamPressureBar),
    grinderBurrMechanism: grinder?.burrMechanism ?? '',
    grinderBurrDiameterMm: valueForInput(grinder?.burrDiameterMm),
    grinderAdjustmentType: grinder?.adjustmentType ?? '',
    grinderBrewRange: setForInput(grinder?.brewRange),
    grinderBeanFeed: grinder?.beanFeed ?? '',
    grinderDoseControlModes: setForInput(grinder?.doseControlModes),
    grinderBurrMaterial: grinder?.burrMaterial ?? '',
    brewerMechanism: brewer?.mechanism ?? '',
    brewerCapacityMl: valueForInput(brewer?.capacityMl),
    brewerFilterFormat: brewer?.filterFormat ?? '',
    brewerFlowControl: brewer?.flowControl ?? '',
    kettleCapacityMl: valueForInput(kettle?.capacityMl),
    kettleSpoutType: kettle?.spoutType ?? '',
    kettleTemperatureControl: kettle?.temperatureControl ?? '',
    kettleMinimumTemperatureCelsius: valueForInput(
      kettle?.minimumTemperatureCelsius,
    ),
    kettleMaximumTemperatureCelsius: valueForInput(
      kettle?.maximumTemperatureCelsius,
    ),
    kettleSupportsTemperatureHold: booleanForInput(
      kettle?.supportsTemperatureHold,
    ),
    scaleResolutionGrams: valueForInput(scale?.resolutionGrams),
    scaleCapacityGrams: valueForInput(scale?.capacityGrams),
    scaleHasTimer: booleanForInput(scale?.hasTimer),
    scaleSupportsAutoTare: booleanForInput(scale?.supportsAutoTare),
    scaleSupportsAutoTimer: booleanForInput(scale?.supportsAutoTimer),
    scaleHasFlowRateDisplay: booleanForInput(scale?.hasFlowRateDisplay),
    tamperDiameterMm: valueForInput(tamper?.diameterMm),
    tamperForceControl: tamper?.forceControl ?? '',
    tamperBaseShape: tamper?.baseShape ?? '',
    tamperSelfLeveling: booleanForInput(tamper?.selfLeveling),
    wdtNeedleDiameterMm: valueForInput(wdt?.needleDiameterMm),
    wdtNeedleCount: valueForInput(wdt?.needleCount),
    wdtDepthControl: wdt?.depthControl ?? '',
    basketNominalDoseGrams: valueForInput(basket?.nominalDoseGrams),
    basketDiameterMm: valueForInput(basket?.diameterMm),
    basketIsPressurized: booleanForInput(basket?.isPressurized),
    basketDoseMinimumGrams: valueForInput(basket?.doseMinimumGrams),
    basketDoseMaximumGrams: valueForInput(basket?.doseMaximumGrams),
    basketKind: basket?.kind ?? '',
  }
}

function decimalOrNull(value: string): string | null {
  return value.trim() || null
}

function integerOrNull(value: string): number | null {
  return value.trim() ? Number(value) : null
}

function booleanOrNull(value: string): boolean | null {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

function enumOrNull<const TValue extends string>(
  value: string,
  allowed: readonly TValue[],
): TValue | null {
  return allowed.find((candidate) => candidate === value) ?? null
}

function enumSetOrNull<const TValue extends string>(
  values: NullableStringSet,
  allowed: readonly TValue[],
): TValue[] | null {
  if (values === null) return null
  const allowedValues = new Set<string>(allowed)
  return [...new Set(values)].filter((value): value is TValue =>
    allowedValues.has(value),
  )
}

function machineSettings(
  values: GearFormValues,
  prefix: 'owner' | 'factory',
): EspressoMachineSettingsInput {
  return {
    brewPressureBar: decimalOrNull(values[`${prefix}BrewPressureBar`]),
    preinfusionEnabled: booleanOrNull(values[`${prefix}PreinfusionEnabled`]),
    preinfusionTimeSeconds: decimalOrNull(
      values[`${prefix}PreinfusionTimeSeconds`],
    ),
    preinfusionPressureBar: decimalOrNull(
      values[`${prefix}PreinfusionPressureBar`],
    ),
    flowLimitMlPerSecond: decimalOrNull(
      values[`${prefix}FlowLimitMlPerSecond`],
    ),
    brewTemperatureOffsetCelsius: decimalOrNull(
      values[`${prefix}BrewTemperatureOffsetCelsius`],
    ),
    programmedVolumeMl: decimalOrNull(values[`${prefix}ProgrammedVolumeMl`]),
    defaultStopMode: enumOrNull(
      values[`${prefix}DefaultStopMode`],
      AUTO_STOP_MODE_VALUES,
    ),
    steamTemperatureCelsius: decimalOrNull(
      values[`${prefix}SteamTemperatureCelsius`],
    ),
    steamPressureBar: decimalOrNull(values[`${prefix}SteamPressureBar`]),
  }
}

function subtypePayload(values: GearFormValues, type: GearType) {
  const machine = isEspressoMachineGearType(type)
  const grinder = isGrinderGearType(type)

  return {
    espressoMachineDetails: machine
      ? {
          portafilterDiameterMm: decimalOrNull(
            values.machinePortafilterDiameterMm,
          ),
          heatingArchitecture: enumOrNull(
            values.machineHeatingArchitecture,
            MACHINE_HEATING_ARCHITECTURE_VALUES,
          ),
          temperatureControl: enumOrNull(
            values.machineTemperatureControl,
            MACHINE_TEMPERATURE_CONTROL_VALUES,
          ),
          pressureControl: enumOrNull(
            values.machinePressureControl,
            MACHINE_PRESSURE_CONTROL_VALUES,
          ),
          flowControl: enumOrNull(
            values.machineFlowControl,
            MACHINE_FLOW_CONTROL_VALUES,
          ),
          preinfusionControl: enumOrNull(
            values.machinePreinfusionControl,
            MACHINE_PREINFUSION_CONTROL_VALUES,
          ),
          shotStopModes: enumSetOrNull(
            values.machineShotStopModes,
            AUTO_STOP_MODE_VALUES,
          ),
          steamSystem: enumOrNull(
            values.machineSteamSystem,
            MACHINE_STEAM_SYSTEM_VALUES,
          ),
          simultaneousBrewAndSteam: booleanOrNull(
            values.machineSimultaneousBrewAndSteam,
          ),
          groupCount: integerOrNull(values.machineGroupCount),
          pumpType: enumOrNull(
            values.machinePumpType,
            MACHINE_PUMP_TYPE_VALUES,
          ),
          waterSourceModes: enumSetOrNull(
            values.machineWaterSourceModes,
            MACHINE_WATER_SOURCE_VALUES,
          ),
          brewPressureMinimumBar: decimalOrNull(
            values.machineBrewPressureMinimumBar,
          ),
          brewPressureMaximumBar: decimalOrNull(
            values.machineBrewPressureMaximumBar,
          ),
          brewTemperatureMinimumCelsius: decimalOrNull(
            values.machineBrewTemperatureMinimumCelsius,
          ),
          brewTemperatureMaximumCelsius: decimalOrNull(
            values.machineBrewTemperatureMaximumCelsius,
          ),
        }
      : null,
    ownerMachineSettings: machine ? machineSettings(values, 'owner') : null,
    factoryMachineSettings: machine ? machineSettings(values, 'factory') : null,
    grinderDetails: grinder
      ? {
          burrMechanism: enumOrNull(
            values.grinderBurrMechanism,
            GRINDER_BURR_MECHANISM_VALUES,
          ),
          burrDiameterMm: decimalOrNull(values.grinderBurrDiameterMm),
          adjustmentType: enumOrNull(
            values.grinderAdjustmentType,
            GRINDER_ADJUSTMENT_TYPE_VALUES,
          ),
          brewRange: enumSetOrNull(
            values.grinderBrewRange,
            GRINDER_BREW_RANGE_VALUES,
          ),
          beanFeed: enumOrNull(
            values.grinderBeanFeed,
            GRINDER_BEAN_FEED_VALUES,
          ),
          doseControlModes: enumSetOrNull(
            values.grinderDoseControlModes,
            GRINDER_DOSE_CONTROL_MODE_VALUES,
          ),
          burrMaterial: enumOrNull(
            values.grinderBurrMaterial,
            GRINDER_BURR_MATERIAL_VALUES,
          ),
        }
      : null,
    brewerDetails:
      type === 'brewer'
        ? {
            mechanism: enumOrNull(
              values.brewerMechanism,
              BREWER_MECHANISM_VALUES,
            ),
            capacityMl: decimalOrNull(values.brewerCapacityMl),
            filterFormat: values.brewerFilterFormat.trim() || null,
            flowControl: enumOrNull(
              values.brewerFlowControl,
              BREWER_FLOW_CONTROL_VALUES,
            ),
          }
        : null,
    kettleDetails:
      type === 'kettle'
        ? {
            capacityMl: decimalOrNull(values.kettleCapacityMl),
            spoutType: enumOrNull(
              values.kettleSpoutType,
              KETTLE_SPOUT_TYPE_VALUES,
            ),
            temperatureControl: enumOrNull(
              values.kettleTemperatureControl,
              KETTLE_TEMPERATURE_CONTROL_VALUES,
            ),
            minimumTemperatureCelsius: decimalOrNull(
              values.kettleMinimumTemperatureCelsius,
            ),
            maximumTemperatureCelsius: decimalOrNull(
              values.kettleMaximumTemperatureCelsius,
            ),
            supportsTemperatureHold: booleanOrNull(
              values.kettleSupportsTemperatureHold,
            ),
          }
        : null,
    scaleDetails:
      type === 'scale'
        ? {
            resolutionGrams: decimalOrNull(values.scaleResolutionGrams),
            capacityGrams: decimalOrNull(values.scaleCapacityGrams),
            hasTimer: booleanOrNull(values.scaleHasTimer),
            supportsAutoTare: booleanOrNull(values.scaleSupportsAutoTare),
            supportsAutoTimer: booleanOrNull(values.scaleSupportsAutoTimer),
            hasFlowRateDisplay: booleanOrNull(values.scaleHasFlowRateDisplay),
          }
        : null,
    tamperDetails:
      type === 'tamper'
        ? {
            diameterMm: decimalOrNull(values.tamperDiameterMm),
            forceControl: enumOrNull(
              values.tamperForceControl,
              TAMPER_FORCE_CONTROL_VALUES,
            ),
            baseShape: enumOrNull(
              values.tamperBaseShape,
              TAMPER_BASE_SHAPE_VALUES,
            ),
            selfLeveling: booleanOrNull(values.tamperSelfLeveling),
          }
        : null,
    wdtDetails:
      type === 'wdt'
        ? {
            needleDiameterMm: decimalOrNull(values.wdtNeedleDiameterMm),
            needleCount: integerOrNull(values.wdtNeedleCount),
            depthControl: enumOrNull(
              values.wdtDepthControl,
              WDT_DEPTH_CONTROL_VALUES,
            ),
          }
        : null,
    basketDetails:
      type === 'basket'
        ? {
            nominalDoseGrams: decimalOrNull(values.basketNominalDoseGrams),
            diameterMm: decimalOrNull(values.basketDiameterMm),
            isPressurized: booleanOrNull(values.basketIsPressurized),
            doseMinimumGrams: decimalOrNull(values.basketDoseMinimumGrams),
            doseMaximumGrams: decimalOrNull(values.basketDoseMaximumGrams),
            kind: enumOrNull(values.basketKind, BASKET_KIND_VALUES),
          }
        : null,
    propertyEvidence: [...values.propertyEvidence],
  }
}

function requiredGearType(value: GearType | ''): GearType {
  if (!value) throw new DomainError('validation', 'Choose a gear type')
  return value
}

function requiredTrimmed(value: string, message: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new DomainError('validation', message)
  return trimmed
}

export function gearCreatePayload(values: GearFormValues) {
  const type = requiredGearType(values.type)
  return {
    brand: requiredTrimmed(values.brand, 'Enter the brand'),
    model: requiredTrimmed(values.model, 'Enter the model'),
    type,
    purchaseDate: values.purchaseDate
      ? new Date(values.purchaseDate)
      : undefined,
    purchasePrice: values.purchasePrice.trim() || undefined,
    priceCurrency: isCurrency(values.priceCurrency)
      ? values.priceCurrency
      : undefined,
    manualUrl: values.manualUrl.trim() || undefined,
    productUrl: values.productUrl.trim() || undefined,
    notes: values.notes || undefined,
    ...subtypePayload(values, type),
  }
}

export function gearUpdatePayload(
  id: number,
  values: GearFormValues,
  confirmTypeChange = false,
) {
  const type = requiredGearType(values.type)
  return {
    id,
    brand: requiredTrimmed(values.brand, 'Enter the brand'),
    model: requiredTrimmed(values.model, 'Enter the model'),
    type,
    purchaseDate: values.purchaseDate ? new Date(values.purchaseDate) : null,
    purchasePrice: values.purchasePrice.trim() || null,
    priceCurrency: isCurrency(values.priceCurrency)
      ? values.priceCurrency
      : null,
    manualUrl: values.manualUrl.trim() || null,
    productUrl: values.productUrl.trim() || null,
    notes: values.notes,
    confirmTypeChange: confirmTypeChange || undefined,
    ...subtypePayload(values, type),
  }
}

export function mergeGearPropertyEvidence(
  existing: readonly GearPropertyEvidenceInput[],
  additions: readonly GearPropertyEvidenceInput[],
) {
  const merged = new Map<string, GearPropertyEvidenceInput>()
  for (const evidence of [...existing, ...additions]) {
    merged.set(
      `${evidence.propertyKey}\u0000${evidence.sourceUrl}\u0000${JSON.stringify(evidence.valueJson)}`,
      evidence,
    )
  }
  return [...merged.values()]
}
