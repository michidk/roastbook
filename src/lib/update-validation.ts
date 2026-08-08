export type ShotUpdateCandidate = {
  readonly id: number
  readonly beanId?: number | null
  readonly recipeId?: number | null
  readonly doseGrams?: string | null
  readonly yieldGrams?: string | null
  readonly brewTimeSeconds?: number | null
  readonly grindSetting?: string | null
  readonly waterTempCelsius?: string | null
  readonly pressure?: string | null
  readonly rating?: number | null
  readonly notes?: string | null
  readonly tasteTagIds?: readonly number[]
}

export type CafeVisitUpdateCandidate = {
  readonly id: number
  readonly coffeeShopId?: number | null
  readonly beanId?: number | null
  readonly drinkName?: string
  readonly drinkType?: string
  readonly price?: string
  readonly currency?: string
  readonly rating?: number | null
  readonly notes?: string
  readonly visitedAt?: Date
  readonly tasteTagIds?: readonly number[]
}

type DecimalRule = {
  readonly label: string
  readonly maximum: number
  readonly fractionDigits: number
}

const SUPPORTED_CURRENCIES = new Set(["EUR", "USD", "GBP", "CHF"])

class UpdateInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "UpdateInputError"
  }
}

function getDecimalError(
  value: string | null | undefined,
  rule: DecimalRule,
): string | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) return `${rule.label} must be a number`
  const fraction = value.split(".")[1]
  if (fraction && fraction.length > rule.fractionDigits) {
    return `${rule.label} must have at most ${rule.fractionDigits} decimal places`
  }
  if (Number(value) < 0 || Number(value) > rule.maximum) {
    return `${rule.label} must be between 0 and ${rule.maximum}`
  }
  return undefined
}

function getRatingError(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  return Number.isInteger(value) && value >= 1 && value <= 5
    ? undefined
    : "Rating must be between 1 and 5"
}

function addError(
  errors: Record<string, string>,
  field: string,
  message: string | undefined,
): void {
  if (message) errors[field] = message
}

export function assertValidUpdate(errors: Readonly<Record<string, string>>): void {
  const message = Object.values(errors)[0]
  if (message) throw new UpdateInputError(message)
}

export function getShotUpdateErrors(
  data: ShotUpdateCandidate,
): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {}
  addError(errors, "doseGrams", getDecimalError(data.doseGrams, {
    label: "Dose",
    maximum: 999.99,
    fractionDigits: 2,
  }))
  addError(errors, "yieldGrams", getDecimalError(data.yieldGrams, {
    label: "Yield",
    maximum: 999.99,
    fractionDigits: 2,
  }))
  addError(errors, "waterTempCelsius", getDecimalError(data.waterTempCelsius, {
    label: "Water temperature",
    maximum: 999.9,
    fractionDigits: 1,
  }))
  addError(errors, "pressure", getDecimalError(data.pressure, {
    label: "Pressure",
    maximum: 99.9,
    fractionDigits: 1,
  }))
  if (
    data.brewTimeSeconds !== null &&
    data.brewTimeSeconds !== undefined &&
    (!Number.isInteger(data.brewTimeSeconds) || data.brewTimeSeconds < 0)
  ) {
    errors.brewTimeSeconds = "Brew time must be a whole number of seconds"
  }
  addError(errors, "rating", getRatingError(data.rating))
  return errors
}

export function getCafeVisitUpdateErrors(
  data: CafeVisitUpdateCandidate,
): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {}
  addError(errors, "price", getDecimalError(data.price, {
    label: "Price",
    maximum: 9999.99,
    fractionDigits: 2,
  }))
  if (data.currency !== undefined && !SUPPORTED_CURRENCIES.has(data.currency)) {
    errors.currency = "Choose a supported currency"
  }
  addError(errors, "rating", getRatingError(data.rating))
  return errors
}
