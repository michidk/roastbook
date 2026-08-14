export type DecimalConstraint = {
  readonly label: string
  readonly maximum: number
  readonly fractionDigits: number
}

export const DECIMAL_CONSTRAINTS = {
  doseGrams: { label: 'Dose', maximum: 999.99, fractionDigits: 2 },
  brewWaterGrams: {
    label: 'Brew water',
    maximum: 99_999.99,
    fractionDigits: 2,
  },
  yieldGrams: { label: 'Yield', maximum: 999.99, fractionDigits: 2 },
  shotTimeSeconds: {
    label: 'Brew time',
    maximum: 9_999.99,
    fractionDigits: 2,
  },
  brewTemperatureCelsius: {
    label: 'Water temperature',
    maximum: 999.9,
    fractionDigits: 1,
  },
  preinfusionTimeSeconds: {
    label: 'Preinfusion time',
    maximum: 99_999.99,
    fractionDigits: 2,
  },
  preinfusionPressureBar: {
    label: 'Preinfusion pressure',
    maximum: 99.99,
    fractionDigits: 2,
  },
  bloomTimeSeconds: {
    label: 'Bloom time',
    maximum: 99_999.99,
    fractionDigits: 2,
  },
  brewPressureBar: {
    label: 'Pressure',
    maximum: 99.99,
    fractionDigits: 2,
  },
  flowRateMlPerSecond: {
    label: 'Flow rate',
    maximum: 99.99,
    fractionDigits: 2,
  },
  tampForceKg: {
    label: 'Tamp force',
    maximum: 99_999.99,
    fractionDigits: 2,
  },
  cafeVisitPrice: { label: 'Price', maximum: 9_999.99, fractionDigits: 2 },
} as const satisfies Record<string, DecimalConstraint>
