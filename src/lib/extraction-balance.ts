/**
 * The simple taste profile: one bipolar axis instead of five separate factors.
 *
 * Sour reads as under-extracted and bitter as over-extracted, which is the
 * usual first dial-in move. The axis deliberately cannot express "sour and
 * bitter at once" — that pattern points at uneven extraction rather than a
 * point on this scale, so it belongs in the detailed factors or a note.
 *
 * Stored as 1–5 to match every other rating column; null means not recorded.
 */
export const EXTRACTION_BALANCE_LEVELS = [1, 2, 3, 4, 5] as const

export type ExtractionBalance = (typeof EXTRACTION_BALANCE_LEVELS)[number]

export const EXTRACTION_BALANCE_BALANCED = 3

export const EXTRACTION_BALANCE_META = {
  label: 'Sour to bitter balance',
  hint: 'Where did this brew land between sour and bitter? Sour usually means under-extracted, so grind finer or run the brew longer. Bitter usually means over-extracted, so grind coarser or stop it sooner. Pick the middle when it tasted balanced.',
  sourLabel: 'Sour',
  balancedLabel: 'Balanced',
  bitterLabel: 'Bitter',
} as const

const LEVEL_LABELS = {
  1: 'Very sour',
  2: 'Slightly sour',
  3: 'Balanced',
  4: 'Slightly bitter',
  5: 'Very bitter',
} as const satisfies Record<ExtractionBalance, string>

export function isExtractionBalance(
  value: unknown,
): value is ExtractionBalance {
  return EXTRACTION_BALANCE_LEVELS.some((level) => level === value)
}

/** Human-readable position on the axis, or null when nothing was recorded. */
export function extractionBalanceLabel(
  value: number | null | undefined,
): string | null {
  return isExtractionBalance(value) ? LEVEL_LABELS[value] : null
}

export function hasExtractionBalance(
  value: number | null | undefined,
): boolean {
  return isExtractionBalance(value)
}
