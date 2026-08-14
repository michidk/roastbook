export const SHOT_SENSORY_RATING_KEYS = [
  'bitterness',
  'acidity',
  'sweetness',
  'body',
  'astringency',
] as const

export type ShotSensoryRatingKey = (typeof SHOT_SENSORY_RATING_KEYS)[number]

export type ShotSensoryRatings = Record<ShotSensoryRatingKey, number>

export const EMPTY_SHOT_SENSORY_RATINGS: ShotSensoryRatings = {
  bitterness: 0,
  acidity: 0,
  sweetness: 0,
  body: 0,
  astringency: 0,
}

export const SHOT_SENSORY_RATING_META = {
  bitterness: {
    label: 'Bitterness',
    hint: 'Notice the intensity of dark cocoa, tonic-like, or burnt notes, especially toward the back of the tongue and in the finish. Rate intensity, not whether it is pleasant.',
  },
  acidity: {
    label: 'Acidity',
    hint: 'Notice a lively, sparkling, or tart sensation like citrus or crisp fruit. Rate its intensity rather than treating all acidity as sourness.',
  },
  sweetness: {
    label: 'Sweetness',
    hint: 'Look for sugar-like roundness reminiscent of ripe fruit, honey, or caramel, often becoming clearer as the coffee cools.',
  },
  body: {
    label: 'Body',
    hint: 'Notice the coffee’s weight and texture in your mouth, from light and tea-like to creamy, heavy, or syrupy.',
  },
  astringency: {
    label: 'Astringency / dryness',
    hint: 'Notice a drying, puckering, or grippy feeling on the tongue, gums, or cheeks, similar to over-steeped tea.',
  },
} as const satisfies Record<
  ShotSensoryRatingKey,
  { readonly label: string; readonly hint: string }
>

type NullableShotSensoryRatings = Partial<
  Record<ShotSensoryRatingKey, number | null | undefined>
>

export function shotSensoryRatingsFrom(
  source: NullableShotSensoryRatings,
): ShotSensoryRatings {
  return Object.fromEntries(
    SHOT_SENSORY_RATING_KEYS.map((key) => [key, source[key] ?? 0]),
  ) as ShotSensoryRatings
}

export function shotSensoryPayload(values: ShotSensoryRatings) {
  return Object.fromEntries(
    SHOT_SENSORY_RATING_KEYS.map((key) => [
      key,
      values[key] === 0 ? null : values[key],
    ]),
  ) as Record<ShotSensoryRatingKey, number | null>
}

export function hasShotSensoryRatings(
  values: NullableShotSensoryRatings,
): boolean {
  return SHOT_SENSORY_RATING_KEYS.some((key) => (values[key] ?? 0) > 0)
}
