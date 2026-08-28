import { normalizeForComparison } from '@/lib/utils'

export type ExtractedRoasterAction = 'create' | 'link' | 'already-linked'

export function findRoasterByName<T extends { readonly name: string }>(
  roasters: readonly T[],
  suggestedName: string,
): T | undefined {
  const normalizedSuggestion = normalizeForComparison(suggestedName)
  if (!normalizedSuggestion) return undefined

  return roasters.find(
    (roaster) => normalizeForComparison(roaster.name) === normalizedSuggestion,
  )
}

export function getExtractedRoasterAction<
  T extends { readonly id: string | number; readonly name: string },
>(
  roasters: readonly T[],
  suggestedName: string | null | undefined,
  currentRoasterId: string,
): ExtractedRoasterAction | null {
  if (!suggestedName || !normalizeForComparison(suggestedName)) return null

  const matchedRoaster = findRoasterByName(roasters, suggestedName)
  if (!matchedRoaster) return 'create'

  return String(matchedRoaster.id) === currentRoasterId
    ? 'already-linked'
    : 'link'
}
