type TasteTagCategory = { readonly category: string | null }

export function isNegativeTasteTag(tag: TasteTagCategory): boolean {
  const category = tag.category?.trim().toLowerCase()
  return category === 'negative' || category === 'defect'
}
