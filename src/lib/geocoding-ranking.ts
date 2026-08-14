export type OpenStreetMapClassification = {
  readonly category?: string
  readonly class?: string
  readonly type?: string
  readonly extratags?: {
    readonly cuisine?: string
  } | null
}

export function prioritizeCoffeeShopCandidates<
  Result extends OpenStreetMapClassification,
>(results: readonly Result[], limit: number): Result[] {
  return [...results]
    .sort(
      (left, right) =>
        getCoffeeShopPriority(left) - getCoffeeShopPriority(right),
    )
    .slice(0, limit)
}

function getCoffeeShopPriority(result: OpenStreetMapClassification): number {
  const category = result.category ?? result.class
  const servesCoffee = result.extratags?.cuisine
    ?.split(';')
    .some((cuisine) => cuisine.trim() === 'coffee_shop')

  if (servesCoffee) return 0
  if (category === 'shop' && result.type === 'coffee') return 1
  if (category === 'amenity' && result.type === 'cafe') return 2
  return 3
}
