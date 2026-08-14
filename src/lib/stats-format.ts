export function formatMeasurement(
  value: number | string | null,
  unit: string,
  formatNumber: (value: number | string) => string = String,
): string {
  return value === null ? 'Not enough data' : `${formatNumber(value)} ${unit}`
}

export function formatRatio(
  value: number | null,
  formatNumber: (value: number | string) => string = String,
): string {
  return value === null ? 'Not enough data' : `1:${formatNumber(value)}`
}
