/** Built-in taste tags: the SCA Coffee Taster's Flavor Wheel, second tier by category. */
export const SCA_FLAVOR_WHEEL = {
  Floral: ['Black Tea', 'Floral'],
  Fruity: ['Berry', 'Dried Fruit', 'Other Fruit', 'Citrus Fruit'],
  'Sour / Fermented': ['Sour', 'Alcohol / Fermented'],
  'Green / Vegetative': ['Olive Oil', 'Raw', 'Green / Vegetative', 'Beany'],
  Other: ['Papery / Musty', 'Chemical'],
  Roasted: ['Pipe Tobacco', 'Tobacco', 'Burnt', 'Cereal'],
  Spices: ['Pungent', 'Pepper', 'Brown Spice'],
  'Nutty / Cocoa': ['Nutty', 'Cocoa'],
  Sweet: [
    'Brown Sugar',
    'Vanilla',
    'Vanillin',
    'Overall Sweet',
    'Sweet Aromatics',
  ],
} as const

export type ScaFlavorCategory = keyof typeof SCA_FLAVOR_WHEEL

export const BUILT_IN_TASTE_TAG_NAMES: readonly string[] =
  Object.values(SCA_FLAVOR_WHEEL).flat()

/** The SCA wheel category of a built-in tag; custom tags have none. */
export function scaFlavorCategory(name: string): ScaFlavorCategory | undefined {
  return (Object.keys(SCA_FLAVOR_WHEEL) as ScaFlavorCategory[]).find(
    (category) =>
      (SCA_FLAVOR_WHEEL[category] as readonly string[]).includes(name),
  )
}

type TasteTagCategory = { readonly category: string | null }

/** How many flavor tags the new-brew form shows before "Show all". */
export const FREQUENT_TASTE_TAG_LIMIT = 12

export const LEGACY_SENSORY_TASTE_TAG_NAMES = [
  'Bright',
  'Crisp',
  'Mellow',
  'Sour',
  'Bitter',
  'Astringent',
  'Syrupy',
  'Creamy',
  'Thin',
  'Full',
  'Honey',
] as const

const LEGACY_SENSORY_TASTE_TAGS = new Set<string>(
  LEGACY_SENSORY_TASTE_TAG_NAMES,
)

export function isLegacySensoryTasteTag(tag: { readonly name: string }) {
  return LEGACY_SENSORY_TASTE_TAGS.has(tag.name)
}

export function isNegativeTasteTag(tag: TasteTagCategory): boolean {
  const category = tag.category?.trim().toLowerCase()
  return category === 'negative' || category === 'defect'
}
