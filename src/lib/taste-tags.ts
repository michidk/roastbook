type TasteTagCategory = { readonly category: string | null }

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
