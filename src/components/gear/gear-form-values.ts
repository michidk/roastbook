import { isCurrency } from '@/lib/app-settings'
import { type GearType, isEspressoMachineGearType } from '@/lib/constants'
import { AUTO_STOP_MODE_VALUES } from '@/lib/domain-contracts'
import { DomainError } from '@/lib/domain-errors'

export type GearSubtypeFormValues = {
  readonly brewPressureOpvBar: string
  readonly supportsPreinfusion: string
  readonly defaultPreinfusionEnabled: string
  readonly defaultPreinfusionTimeSeconds: string
  readonly defaultPreinfusionPressureBar: string
  readonly defaultFlowLimitMlPerSecond: string
  readonly temperatureOffsetCelsius: string
  readonly volumetricShotVolumeMl: string
  readonly autoStopMode: string
  readonly steamTemperatureCelsius: string
  readonly steamPressureBar: string
  readonly nominalDoseGrams: string
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
}

export const EMPTY_GEAR_SUBTYPE_VALUES: GearSubtypeFormValues = {
  brewPressureOpvBar: '',
  supportsPreinfusion: '',
  defaultPreinfusionEnabled: '',
  defaultPreinfusionTimeSeconds: '',
  defaultPreinfusionPressureBar: '',
  defaultFlowLimitMlPerSecond: '',
  temperatureOffsetCelsius: '',
  volumetricShotVolumeMl: '',
  autoStopMode: '',
  steamTemperatureCelsius: '',
  steamPressureBar: '',
  nominalDoseGrams: '',
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
  readonly machineSettings?: {
    readonly brewPressureOpvBar: string | null
    readonly supportsPreinfusion: boolean | null
    readonly defaultPreinfusionEnabled: boolean | null
    readonly defaultPreinfusionTimeSeconds: string | null
    readonly defaultPreinfusionPressureBar: string | null
    readonly defaultFlowLimitMlPerSecond: string | null
    readonly temperatureOffsetCelsius: string | null
    readonly volumetricShotVolumeMl: string | null
    readonly autoStopMode: string | null
    readonly steamTemperatureCelsius: string | null
    readonly steamPressureBar: string | null
  } | null
  readonly basketDetails?: {
    readonly nominalDoseGrams: string | null
  } | null
}

function dateForInput(date: Date | string | null | undefined) {
  if (!date) return ''
  const parsedDate = new Date(date)
  return Number.isNaN(parsedDate.getTime())
    ? ''
    : (parsedDate.toISOString().split('T', 1)[0] ?? '')
}

function booleanForInput(value: boolean | null | undefined) {
  return value == null ? '' : String(value)
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
    ...EMPTY_GEAR_SUBTYPE_VALUES,
  }
}

export function gearFormValuesFrom(
  gear?: GearFormValueSource | null,
): GearFormValues {
  if (!gear) return createEmptyGearFormValues()
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
    brewPressureOpvBar: gear.machineSettings?.brewPressureOpvBar ?? '',
    supportsPreinfusion: booleanForInput(
      gear.machineSettings?.supportsPreinfusion,
    ),
    defaultPreinfusionEnabled: booleanForInput(
      gear.machineSettings?.defaultPreinfusionEnabled,
    ),
    defaultPreinfusionTimeSeconds:
      gear.machineSettings?.defaultPreinfusionTimeSeconds ?? '',
    defaultPreinfusionPressureBar:
      gear.machineSettings?.defaultPreinfusionPressureBar ?? '',
    defaultFlowLimitMlPerSecond:
      gear.machineSettings?.defaultFlowLimitMlPerSecond ?? '',
    temperatureOffsetCelsius:
      gear.machineSettings?.temperatureOffsetCelsius ?? '',
    volumetricShotVolumeMl: gear.machineSettings?.volumetricShotVolumeMl ?? '',
    autoStopMode: gear.machineSettings?.autoStopMode ?? '',
    steamTemperatureCelsius:
      gear.machineSettings?.steamTemperatureCelsius ?? '',
    steamPressureBar: gear.machineSettings?.steamPressureBar ?? '',
    nominalDoseGrams: gear.basketDetails?.nominalDoseGrams ?? '',
  }
}

function booleanOrNull(value: string): boolean | null {
  return value === '' ? null : value === 'true'
}

function autoStopModeOrNull(value: string) {
  return AUTO_STOP_MODE_VALUES.find((mode) => mode === value) ?? null
}

function subtypePayload(values: GearFormValues, type: GearType) {
  return {
    machineSettings: isEspressoMachineGearType(type)
      ? {
          brewPressureOpvBar: values.brewPressureOpvBar || null,
          supportsPreinfusion: booleanOrNull(values.supportsPreinfusion),
          defaultPreinfusionEnabled: booleanOrNull(
            values.defaultPreinfusionEnabled,
          ),
          defaultPreinfusionTimeSeconds:
            values.defaultPreinfusionTimeSeconds || null,
          defaultPreinfusionPressureBar:
            values.defaultPreinfusionPressureBar || null,
          defaultFlowLimitMlPerSecond:
            values.defaultFlowLimitMlPerSecond || null,
          temperatureOffsetCelsius: values.temperatureOffsetCelsius || null,
          volumetricShotVolumeMl: values.volumetricShotVolumeMl || null,
          autoStopMode: autoStopModeOrNull(values.autoStopMode),
          steamTemperatureCelsius: values.steamTemperatureCelsius || null,
          steamPressureBar: values.steamPressureBar || null,
        }
      : null,
    basketDetails:
      type === 'basket'
        ? { nominalDoseGrams: values.nominalDoseGrams || null }
        : null,
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

export function gearUpdatePayload(id: number, values: GearFormValues) {
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
    ...subtypePayload(values, type),
  }
}
