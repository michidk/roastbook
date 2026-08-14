export function parseCoordinate(
  value: string | number | null | undefined,
  axis?: 'latitude' | 'longitude',
): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return null
  if (axis === 'latitude' && Math.abs(parsed) > 90) return null
  if (axis === 'longitude' && Math.abs(parsed) > 180) return null
  return parsed
}
