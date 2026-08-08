export function toRatingInput(value: number | null): number {
  return value ?? 0
}

export function toNullableRating(value: number): number | null {
  return value === 0 ? null : value
}
