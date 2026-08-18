import { isDateTooFarInFuture } from '@/lib/date-input'
import { CURRENCY_VALUES } from '@/lib/domain-contracts'
import {
  DECIMAL_CONSTRAINTS,
  type DecimalConstraint,
} from '@/lib/measurement-constraints'
import type { ShotParameterInput } from '@/lib/shot-parameters'
import type { ShotSensoryRatingKey } from '@/lib/shot-sensory'

export type ShotUpdateCandidate = ShotParameterInput & {
  readonly id: number
  readonly brewingMethodId: number
  readonly beanId?: number | null
  readonly ratioBasis?: 'target_yield' | 'brew_water' | null
  readonly paperFilterPosition?: 'none' | 'top' | 'bottom' | 'both' | null
  readonly rating?: number | null
  readonly bitterness?: number | null
  readonly acidity?: number | null
  readonly sweetness?: number | null
  readonly body?: number | null
  readonly astringency?: number | null
  readonly notes?: string | null
  readonly tasteTagIds?: readonly number[]
  readonly brewedAt?: Date
}

export type CafeVisitUpdateCandidate = {
  readonly id: number
  readonly coffeeShopId?: number | null
  readonly beanId?: number | null
  readonly drinkName?: string | null
  readonly drinkType?: string | null
  readonly price?: string | null
  readonly currency?: string | null
  readonly rating?: number | null
  readonly notes?: string | null
  readonly visitedAt?: Date
  readonly tasteTagIds?: readonly number[]
}

const SUPPORTED_CURRENCIES = new Set<string>(CURRENCY_VALUES)
const SHOT_DECIMAL_RULES = [
  ['doseGrams', DECIMAL_CONSTRAINTS.doseGrams],
  ['yieldGrams', DECIMAL_CONSTRAINTS.yieldGrams],
  ['brewTemperatureCelsius', DECIMAL_CONSTRAINTS.brewTemperatureCelsius],
  ['brewPressureBar', DECIMAL_CONSTRAINTS.brewPressureBar],
  ['shotTimeSeconds', DECIMAL_CONSTRAINTS.shotTimeSeconds],
] as const satisfies readonly (readonly [
  keyof ShotParameterInput,
  DecimalConstraint,
])[]

const SHOT_SENSORY_RATING_LABELS = {
  bitterness: 'Bitterness',
  acidity: 'Acidity',
  sweetness: 'Sweetness',
  body: 'Body',
  astringency: 'Astringency',
} as const satisfies Record<ShotSensoryRatingKey, string>

class UpdateInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UpdateInputError'
  }
}

function getDecimalError(
  value: string | null | undefined,
  rule: DecimalConstraint,
): string | undefined {
  if (value === null || value === undefined || value === '') return undefined
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) return `${rule.label} must be a number`
  const fraction = value.split('.')[1]
  if (fraction && fraction.length > rule.fractionDigits) {
    return `${rule.label} must have at most ${rule.fractionDigits} decimal places`
  }
  if (Number(value) < 0 || Number(value) > rule.maximum) {
    return `${rule.label} must be between 0 and ${rule.maximum}`
  }
  return undefined
}

function getRatingError(
  value: number | null | undefined,
  label = 'Rating',
): string | undefined {
  if (value === null || value === undefined) return undefined
  return Number.isInteger(value) && value >= 1 && value <= 5
    ? undefined
    : `${label} must be between 1 and 5`
}

function getDateError(
  value: Date | undefined,
  label: string,
): string | undefined {
  if (!value) return undefined
  if (Number.isNaN(value.getTime())) return `${label} must be a valid date`
  return isDateTooFarInFuture(value)
    ? `${label} cannot be in the future`
    : undefined
}

function addError(
  errors: Record<string, string>,
  field: string,
  message: string | undefined,
): void {
  if (message) errors[field] = message
}

export function assertValidUpdate(
  errors: Readonly<Record<string, string>>,
): void {
  const message = Object.values(errors)[0]
  if (message) throw new UpdateInputError(message)
}

export function getShotUpdateErrors<
  Candidate extends Omit<ShotUpdateCandidate, 'id'>,
>(data: Candidate): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {}
  if (!Number.isInteger(data.brewingMethodId) || data.brewingMethodId <= 0) {
    errors.brewingMethodId = 'Choose a brewing method'
  }
  for (const [field, rule] of SHOT_DECIMAL_RULES) {
    addError(errors, field, getDecimalError(data[field], rule))
  }
  addError(errors, 'rating', getRatingError(data.rating))
  for (const [field, label] of Object.entries(SHOT_SENSORY_RATING_LABELS)) {
    addError(
      errors,
      field,
      getRatingError(data[field as ShotSensoryRatingKey], label),
    )
  }
  addError(errors, 'brewedAt', getDateError(data.brewedAt, 'Brewed at'))
  return errors
}

export function getCafeVisitUpdateErrors(
  data: CafeVisitUpdateCandidate,
): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {}
  addError(
    errors,
    'price',
    getDecimalError(data.price, DECIMAL_CONSTRAINTS.cafeVisitPrice),
  )
  if (
    data.currency !== undefined &&
    data.currency !== null &&
    !SUPPORTED_CURRENCIES.has(data.currency)
  ) {
    errors.currency = 'Choose a supported currency'
  }
  addError(errors, 'rating', getRatingError(data.rating))
  addError(errors, 'visitedAt', getDateError(data.visitedAt, 'Visited at'))
  return errors
}
