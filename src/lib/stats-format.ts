export function formatMeasurement(value: number | null, unit: string): string {
  return value === null ? "Not enough data" : `${value}${unit}`
}

export function formatRatio(value: number | null): string {
  return value === null ? "Not enough data" : `1:${value}`
}
