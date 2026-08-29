import { EXTRACTION_BALANCE_META } from '@/lib/extraction-balance'
import {
  SHOT_SENSORY_RATING_KEYS,
  SHOT_SENSORY_RATING_META,
  type ShotSensoryRatingKey,
} from '@/lib/shot-sensory'

/**
 * The tasting inputs an installation can switch on or off. A disabled field is
 * neither offered while rating nor rendered anywhere it would otherwise be
 * shown; already recorded values stay in the database untouched.
 */
export const TASTE_PROFILE_FIELDS = [
  'overallRating',
  'extractionBalance',
  ...SHOT_SENSORY_RATING_KEYS,
  'flavorTags',
  'notes',
] as const

export type TasteProfileField = (typeof TASTE_PROFILE_FIELDS)[number]

export type TasteProfileConfig = Readonly<Record<TasteProfileField, boolean>>

/**
 * The rating scales, in the order the settings panel offers them. Every scale
 * is independent: an installation can ask for the overall score, the
 * sour-to-bitter axis, any of the individual factors, or any mix of them.
 */
export const TASTE_PROFILE_SCALE_FIELDS = [
  'overallRating',
  'extractionBalance',
  ...SHOT_SENSORY_RATING_KEYS,
] as const

/** The fields a fresh installation starts with: the individual factors. */
export const DEFAULT_TASTE_PROFILE_FIELDS = TASTE_PROFILE_FIELDS.filter(
  (field) => field !== 'extractionBalance',
)

export const TASTE_PROFILE_FIELD_META = {
  overallRating: {
    label: 'Overall rating',
    description:
      'The one-to-five star score on brews, café visits, and saved cafés.',
  },
  extractionBalance: {
    label: EXTRACTION_BALANCE_META.label,
    description: 'Where the brew landed on a single sour-to-bitter axis.',
  },
  bitterness: {
    label: SHOT_SENSORY_RATING_META.bitterness.label,
    description: 'Intensity of dark cocoa, tonic-like, or burnt notes.',
  },
  acidity: {
    label: SHOT_SENSORY_RATING_META.acidity.label,
    description: 'Intensity of the lively, sparkling, or tart sensation.',
  },
  sweetness: {
    label: SHOT_SENSORY_RATING_META.sweetness.label,
    description: 'Sugar-like roundness reminiscent of ripe fruit or caramel.',
  },
  body: {
    label: SHOT_SENSORY_RATING_META.body.label,
    description: 'Weight and texture in the mouth, from tea-like to syrupy.',
  },
  astringency: {
    label: SHOT_SENSORY_RATING_META.astringency.label,
    description: 'Drying, puckering, or grippy feeling on the tongue.',
  },
  flavorTags: {
    label: 'Flavor tags',
    description: 'The taste tag chips picked while rating a brew or visit.',
  },
  notes: {
    label: 'Tasting notes',
    description: 'The free-text note recorded alongside a rating.',
  },
} as const satisfies Record<
  TasteProfileField,
  { readonly label: string; readonly description: string }
>

export const DEFAULT_TASTE_PROFILE_CONFIG: TasteProfileConfig =
  tasteProfileConfigFrom(DEFAULT_TASTE_PROFILE_FIELDS)

export function isTasteProfileField(
  value: unknown,
): value is TasteProfileField {
  return TASTE_PROFILE_FIELDS.some((field) => field === value)
}

export function tasteProfileConfigFrom(
  fields: readonly string[],
): TasteProfileConfig {
  return Object.fromEntries(
    TASTE_PROFILE_FIELDS.map((field) => [field, fields.includes(field)]),
  ) as TasteProfileConfig
}

export function enabledTasteProfileFields(
  config: TasteProfileConfig,
): TasteProfileField[] {
  return TASTE_PROFILE_FIELDS.filter((field) => config[field])
}

export function enabledSensoryRatingKeys(
  config: TasteProfileConfig,
): ShotSensoryRatingKey[] {
  return SHOT_SENSORY_RATING_KEYS.filter((key) => config[key])
}

export function hasEnabledTasteProfileField(
  config: TasteProfileConfig,
): boolean {
  return TASTE_PROFILE_FIELDS.some((field) => config[field])
}
