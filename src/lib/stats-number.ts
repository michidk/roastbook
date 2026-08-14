export function toNullableNumber(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeRatingAverages<
  Row extends { readonly avgRating: string | number | null },
>(
  rows: readonly Row[],
): Array<Omit<Row, 'avgRating'> & { readonly avgRating: number | null }> {
  return rows.map(({ avgRating, ...row }) => ({
    ...row,
    avgRating: toNullableNumber(avgRating),
  }))
}
