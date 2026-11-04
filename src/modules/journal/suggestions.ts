import {
  FREQUENT_TASTE_TAG_LIMIT,
  LEGACY_SENSORY_TASTE_TAG_NAMES,
} from '@/lib/taste-tags'
import type { JournalViews } from './views'

export function journalSuggestions(view: JournalViews, operation: string) {
  const shots = view
    .shots()
    .sort((a, b) => b.brewedAt.getTime() - a.brewedAt.getTime() || b.id - a.id)
  if (operation === 'suggestions/getBeanSuggestions') {
    const purchases = view.activePurchases()
    const recent = shots.flatMap((shot) => {
      const purchase = purchases.find(
        (row) => row.purchaseId === shot.beanPurchaseId,
      )
      return purchase
        ? [
            {
              id: purchase.id,
              purchaseId: purchase.purchaseId,
              name: purchase.name,
            },
          ]
        : []
    })
    return unique(
      [
        ...unique(recent, (row) => row.purchaseId).slice(0, 5),
        ...purchases.slice(0, 2).map((row) => ({
          id: row.id,
          purchaseId: row.purchaseId,
          name: row.name,
        })),
      ],
      (row) => row.purchaseId,
    )
  }
  if (operation === 'suggestions/getBrewingMethodSuggestions')
    return unique(
      shots.flatMap((shot) =>
        shot.brewingMethod
          ? [
              {
                id: shot.brewingMethod.id,
                name: shot.brewingMethod.name,
                lastUsedAt: shot.brewedAt,
                lastUsedShotId: shot.id,
              },
            ]
          : [],
      ),
      (row) => row.id,
    ).slice(0, 5)
  if (operation === 'suggestions/getDrinkTypeSuggestions')
    return view
      .all('drinkTypes')
      .filter((row) => !row.isArchived)
      .map((row) => ({
        id: row.id,
        name: row.name,
        uses: shots.filter((shot) => shot.drinkTypeId === row.id).length,
      }))
      .filter((row) => row.uses > 0)
      .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name))
      .slice(0, 5)
  if (operation === 'suggestions/getTasteTagSuggestions')
    return view
      .all('tasteTags')
      .filter(
        (row) =>
          !LEGACY_SENSORY_TASTE_TAG_NAMES.some((name) => name === row.name),
      )
      .map((row) => ({
        id: row.id,
        uses: view.tables.shotTasteTags.filter(
          (link) => link.tasteTagId === row.id,
        ).length,
      }))
      .filter((row) => row.uses > 0)
      .sort((a, b) => b.uses - a.uses)
      .slice(0, FREQUENT_TASTE_TAG_LIMIT)
  if (operation === 'suggestions/getLastBeansByBrewingMethod')
    return unique(
      shots.filter(
        (row) =>
          row.beanId &&
          view.tables.beanPurchases.some(
            (purchase) =>
              purchase.beanId === row.beanId && !purchase.isArchived,
          ),
      ),
      (row) => row.brewingMethodId,
    ).map((row) => ({
      brewingMethodId: row.brewingMethodId,
      beanId: row.beanId,
      beanPurchaseId: row.beanPurchaseId,
    }))
  throw new Error('This suggestion is unavailable')
}
function unique<T>(rows: T[], key: (row: T) => number) {
  const seen = new Set<number>()
  return rows.filter((row) => {
    const value = key(row)
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}
