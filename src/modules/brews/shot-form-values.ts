import { isEspressoMachineGearType, isGrinderGearType } from '@/lib/constants'
import {
  type DistributionMethod,
  isDistributionMethod,
  type PaperFilterPosition,
  type RatioBasis,
  type ShotParameterValues,
} from '@/lib/shot-parameters'
import { EMPTY_SHOT_SENSORY_RATINGS } from '@/lib/shot-sensory'

export type ShotFormValues = {
  brewingMethodId: string
  beanId: string
  drinkTypeId: string
  drinkOptionValueIds: Readonly<Record<string, string>>
  machineId: string
  doseGrams: string
  brewWaterGrams: string
  ratioBasis: RatioBasis | ''
  grinderId: string
  grindSetting: string
  yieldGrams: string
  shotTimeSeconds: string
  targetTimeSeconds: string
  brewTemperatureCelsius: string
  preinfusionTimeSeconds: string
  preinfusionPressureBar: string
  bloomTimeSeconds: string
  brewPressureBar: string
  flowRateMlPerSecond: string
  basketId: string
  usesPuckScreen: boolean | null
  paperFilterPosition: PaperFilterPosition | ''
  distributionMethod: DistributionMethod | ''
  tampForceKg: string
  accessoryGearIds: number[]
  rating: number
  extractionBalance: number
  bitterness: number
  acidity: number
  sweetness: number
  body: number
  astringency: number
  notes: string
}

export const EMPTY_SHOT_FORM_VALUES: ShotFormValues = {
  ...EMPTY_SHOT_SENSORY_RATINGS,
  brewingMethodId: '',
  beanId: '',
  drinkTypeId: '',
  drinkOptionValueIds: {},
  machineId: '',
  doseGrams: '',
  brewWaterGrams: '',
  ratioBasis: '',
  grinderId: '',
  grindSetting: '',
  yieldGrams: '',
  shotTimeSeconds: '',
  targetTimeSeconds: '',
  brewTemperatureCelsius: '',
  preinfusionTimeSeconds: '',
  preinfusionPressureBar: '',
  bloomTimeSeconds: '',
  brewPressureBar: '',
  flowRateMlPerSecond: '',
  basketId: '',
  usesPuckScreen: false,
  paperFilterPosition: 'none',
  distributionMethod: '',
  tampForceKg: '',
  accessoryGearIds: [],
  rating: 0,
  extractionBalance: 0,
  notes: '',
}

type ShotParameterSource = Omit<
  ShotParameterValues,
  'ratioBasis' | 'paperFilterPosition' | 'distributionMethod'
> & {
  readonly drinkTypeId?: number | null
  readonly drinkOptions?: readonly {
    readonly optionValueId: number
    readonly optionValue: { readonly groupId: number }
  }[]
  readonly ratioBasis: string | null
  readonly paperFilterPosition: string | null
  readonly distributionMethod: string | null
}

export function shotFormValuesFrom(
  source: ShotParameterSource,
): ShotFormValues {
  return {
    ...EMPTY_SHOT_FORM_VALUES,
    brewingMethodId: String(source.brewingMethodId),
    beanId: source.beanId ? String(source.beanId) : '',
    drinkTypeId: source.drinkTypeId ? String(source.drinkTypeId) : '',
    drinkOptionValueIds: Object.fromEntries(
      (source.drinkOptions ?? []).map((link) => [
        String(link.optionValue.groupId),
        String(link.optionValueId),
      ]),
    ),
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
    targetTimeSeconds: source.targetTimeSeconds ?? '',
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
    distributionMethod:
      source.distributionMethod &&
      isDistributionMethod(source.distributionMethod)
        ? source.distributionMethod
        : '',
    tampForceKg: source.tampForceKg ?? '',
    accessoryGearIds: [...source.accessoryGearIds],
  }
}

const RECIPE_FORM_KEYS = [
  'brewingMethodId',
  'beanId',
  'machineId',
  'doseGrams',
  'brewWaterGrams',
  'ratioBasis',
  'grinderId',
  'grindSetting',
  'yieldGrams',
  'shotTimeSeconds',
  'targetTimeSeconds',
  'brewTemperatureCelsius',
  'preinfusionTimeSeconds',
  'preinfusionPressureBar',
  'bloomTimeSeconds',
  'brewPressureBar',
  'flowRateMlPerSecond',
  'basketId',
  'usesPuckScreen',
  'paperFilterPosition',
  'distributionMethod',
  'tampForceKg',
  'accessoryGearIds',
] as const satisfies readonly (keyof ShotFormValues)[]

export function shotFormValuesWithRecipe(
  current: ShotFormValues,
  recipe: ShotParameterSource,
): ShotFormValues {
  const recipeValues = shotFormValuesFrom(recipe)
  const next = { ...current }

  for (const key of RECIPE_FORM_KEYS) {
    const value = recipeValues[key]
    const isEmpty =
      value === '' ||
      value === null ||
      (Array.isArray(value) && value.length === 0)
    if (!isEmpty) Object.assign(next, { [key]: value })
  }

  return next
}

type GearSetSource = {
  readonly machineId: number | null
  readonly grinderId: number | null
  readonly basketId: number | null
  readonly accessoryGearIds: readonly number[]
}

export function shotFormValuesWithGearSet(
  current: ShotFormValues,
  gearSet: GearSetSource,
): ShotFormValues {
  const next = { ...current }
  if (gearSet.machineId) next.machineId = String(gearSet.machineId)
  if (gearSet.grinderId) next.grinderId = String(gearSet.grinderId)
  if (gearSet.basketId) next.basketId = String(gearSet.basketId)
  if (gearSet.accessoryGearIds.length > 0) {
    next.accessoryGearIds = [...gearSet.accessoryGearIds]
  }
  return next
}

export type GearOption = {
  readonly id: number
  readonly name: string
  readonly type: string
  readonly isArchived?: boolean
}

export type EquipmentSelection = Pick<
  ShotFormValues,
  'machineId' | 'grinderId' | 'basketId' | 'accessoryGearIds'
>

export function availableGearForShot(
  values: EquipmentSelection,
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

export function gearByEquipmentRole(gear: readonly GearOption[]) {
  return {
    brewers: gear.filter(
      (item) => isEspressoMachineGearType(item.type) || item.type === 'brewer',
    ),
    grinders: gear.filter((item) => isGrinderGearType(item.type)),
    baskets: gear.filter((item) => item.type === 'basket'),
    accessories: gear.filter(
      (item) =>
        !isEspressoMachineGearType(item.type) &&
        !isGrinderGearType(item.type) &&
        item.type !== 'brewer' &&
        item.type !== 'basket',
    ),
  }
}
