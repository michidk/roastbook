export function gearName(
  brand: string | null | undefined,
  model: string | null | undefined,
) {
  return [brand, model]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
}
