export function toNullableNumber(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeRatingAverages<
  Row extends { readonly avgRating: string | number | null },
>(rows: readonly Row[]) {
  return rows.map((row) => ({
    ...row,
    avgRating: toNullableNumber(row.avgRating),
  }))
}
