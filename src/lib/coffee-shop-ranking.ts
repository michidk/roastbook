type RankableCoffeeShop = {
  readonly id: number
  readonly name: string
  readonly isFavorite: boolean
}

type CoffeeShopVisit = {
  readonly coffeeShopId: number | null
  readonly visitedAt: Date
}

export function getFeaturedCoffeeShops<T extends RankableCoffeeShop>(
  coffeeShops: readonly T[],
  visits: readonly CoffeeShopVisit[],
  recentLimit: number,
): T[] {
  const latestVisitByCoffeeShop = getLatestVisitByCoffeeShop(visits)
  const byLatestVisit = createLatestVisitComparator<T>(latestVisitByCoffeeShop)

  const favorites = coffeeShops
    .filter((coffeeShop) => coffeeShop.isFavorite)
    .sort(byLatestVisit)
  const recent = coffeeShops
    .filter(
      (coffeeShop) =>
        !coffeeShop.isFavorite && latestVisitByCoffeeShop.has(coffeeShop.id),
    )
    .sort(byLatestVisit)
    .slice(0, recentLimit)

  return [...favorites, ...recent]
}

export function sortCoffeeShopsByFavoriteAndLastVisit<
  T extends RankableCoffeeShop,
>(coffeeShops: readonly T[], visits: readonly CoffeeShopVisit[]): T[] {
  const latestVisitByCoffeeShop = getLatestVisitByCoffeeShop(visits)
  const byLatestVisit = createLatestVisitComparator<T>(latestVisitByCoffeeShop)

  return [...coffeeShops].sort((left, right) => {
    if (left.isFavorite !== right.isFavorite) {
      return left.isFavorite ? -1 : 1
    }

    return byLatestVisit(left, right)
  })
}

function createLatestVisitComparator<T extends RankableCoffeeShop>(
  latestVisitByCoffeeShop: ReadonlyMap<number, number>,
): (left: T, right: T) => number {
  return (left, right) => {
    const latestDifference =
      (latestVisitByCoffeeShop.get(right.id) ?? Number.NEGATIVE_INFINITY) -
      (latestVisitByCoffeeShop.get(left.id) ?? Number.NEGATIVE_INFINITY)
    return latestDifference || left.name.localeCompare(right.name)
  }
}

function getLatestVisitByCoffeeShop(
  visits: readonly CoffeeShopVisit[],
): Map<number, number> {
  const latestVisitByCoffeeShop = new Map<number, number>()

  for (const visit of visits) {
    if (visit.coffeeShopId === null) continue
    const visitedAt = visit.visitedAt.getTime()
    const currentLatest = latestVisitByCoffeeShop.get(visit.coffeeShopId)
    if (currentLatest === undefined || visitedAt > currentLatest) {
      latestVisitByCoffeeShop.set(visit.coffeeShopId, visitedAt)
    }
  }

  return latestVisitByCoffeeShop
}
