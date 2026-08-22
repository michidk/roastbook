export type BeanWeightEstimate = {
  initialWeight: number
  usedWeight: number
  remainingWeight: number
  percentRemaining: number
}

export function estimateRemainingBeanWeight(
  initialWeightValue: string | number | null | undefined,
  usedWeightValue: string | number | null | undefined,
): BeanWeightEstimate | null {
  const initialWeight = Number(initialWeightValue)
  if (!Number.isFinite(initialWeight) || initialWeight <= 0) return null

  const parsedUsedWeight = Number(usedWeightValue ?? 0)
  const usedWeight = Number.isFinite(parsedUsedWeight)
    ? Math.max(0, parsedUsedWeight)
    : 0
  const remainingWeight = Math.max(0, initialWeight - usedWeight)

  return {
    initialWeight,
    usedWeight,
    remainingWeight,
    percentRemaining: Math.round((remainingWeight / initialWeight) * 100),
  }
}
