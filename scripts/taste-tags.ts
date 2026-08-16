// The hint preserves the descriptor's position in the flavor-wheel hierarchy
// for future AI-assisted tagging. The UI intentionally presents one ungrouped
// list: hierarchy is metadata, not a browsing taxonomy.
const FLAVOR_WHEEL_TAGS = [
  {
    name: 'Fruity',
    category: 'Flavor',
    hint: 'Flavor wheel: Fruity. A general ripe-fruit aroma when no more specific fruit family fits.',
    extractionAxis: '0.3',
    strengthAxis: '0.5',
  },
  {
    name: 'Berry',
    category: 'Flavor',
    hint: 'Flavor wheel: Fruity → Berry. Strawberry, raspberry, blueberry, or blackberry-like aromas.',
    extractionAxis: '0.3',
    strengthAxis: '0.5',
  },
  {
    name: 'Dried fruit',
    category: 'Flavor',
    hint: 'Flavor wheel: Fruity → Dried fruit. Raisin, prune, date, or dried-berry aromas.',
    extractionAxis: '0.4',
    strengthAxis: '0.6',
  },
  {
    name: 'Citrus',
    category: 'Flavor',
    hint: 'Flavor wheel: Fruity → Citrus fruit. Lemon, lime, orange, grapefruit, or citrus-peel aromas.',
    extractionAxis: '0.4',
    strengthAxis: '0.4',
  },
  {
    name: 'Stone fruit',
    category: 'Flavor',
    hint: 'Flavor wheel: Fruity → Other fruit. Peach, apricot, plum, nectarine, or cherry-like aromas.',
    extractionAxis: '0.35',
    strengthAxis: '0.5',
  },
  {
    name: 'Tropical fruit',
    category: 'Flavor',
    hint: 'Flavor wheel: Fruity → Other fruit. Pineapple, mango, papaya, passion fruit, or coconut-like aromas.',
    extractionAxis: '0.35',
    strengthAxis: '0.55',
  },
  {
    name: 'Floral',
    category: 'Flavor',
    hint: 'Flavor wheel: Floral. Jasmine, rose, chamomile, or tea-like aromas.',
    extractionAxis: '0.2',
    strengthAxis: '0.3',
  },
  {
    name: 'Chocolate',
    category: 'Flavor',
    hint: 'Flavor wheel: Nutty/Cocoa → Cocoa. Milk chocolate, dark chocolate, or cocoa-like aromas.',
    extractionAxis: '0.6',
    strengthAxis: '0.7',
  },
  {
    name: 'Nutty',
    category: 'Flavor',
    hint: 'Flavor wheel: Nutty/Cocoa → Nutty. Almond, hazelnut, peanut, or walnut-like aromas.',
    extractionAxis: '0.5',
    strengthAxis: '0.6',
  },
  {
    name: 'Caramel',
    category: 'Flavor',
    hint: 'Flavor wheel: Sweet → Brown sugar. Caramelized, honey, molasses, or maple-like aromas.',
    extractionAxis: '0.6',
    strengthAxis: '0.6',
  },
  {
    name: 'Vanilla',
    category: 'Flavor',
    hint: 'Flavor wheel: Sweet → Vanilla. Vanilla, marshmallow, or custard-like sweet aromatics.',
    extractionAxis: '0.5',
    strengthAxis: '0.5',
  },
  {
    name: 'Spicy',
    category: 'Flavor',
    hint: 'Flavor wheel: Spices. Cinnamon, clove, nutmeg, anise, or pepper-like aromas.',
    extractionAxis: '0.7',
    strengthAxis: '0.6',
  },
  {
    name: 'Roasted',
    category: 'Flavor',
    hint: 'Flavor wheel: Roasted. Toasted, coffee-like, smoky, or tobacco-like aromas.',
    extractionAxis: '0.75',
    strengthAxis: '0.75',
  },
  {
    name: 'Cereal',
    category: 'Flavor',
    hint: 'Flavor wheel: Roasted → Cereal. Grain, malt, or fresh-bread aromas.',
    extractionAxis: '0.55',
    strengthAxis: '0.45',
  },
  {
    name: 'Green / vegetative',
    category: 'Flavor',
    hint: 'Flavor wheel: Green/Vegetative. Fresh, herbal, peapod, hay, or unripe-plant aromas.',
    extractionAxis: '0.25',
    strengthAxis: '0.4',
  },
  {
    name: 'Earthy',
    category: 'Flavor',
    hint: 'Flavor wheel: Other → Musty/Earthy. Soil, damp wood, or dusty aromas.',
    extractionAxis: '0.7',
    strengthAxis: '0.7',
  },
  {
    name: 'Fermented',
    category: 'Flavor',
    hint: 'Flavor wheel: Sour/Fermented → Fermented. Winey, overripe, or alcohol-like aromas, separate from acidity intensity.',
    extractionAxis: '0.45',
    strengthAxis: '0.7',
  },
  {
    name: 'Woody',
    category: 'Flavor',
    hint: 'Flavor wheel: Other → Papery/Musty → Woody. Dry wood, bark, cedar, or pencil-shaving aromas.',
    extractionAxis: '0.7',
    strengthAxis: '0.55',
  },
] as const

const UNDER_EXTRACTED_HINT =
  'Espresso Compass: under-extracted and strong — improve extraction and/or extract more (grind finer, extract longer, or increase yield).'
const SWEET_SPOT_HINT =
  'Espresso Compass: sweet spot — extraction and strength are on target.'
const OVER_EXTRACTED_HINT =
  'Espresso Compass: over-extracted and weak — decrease yield and/or extract less (grind coarser or cut the shot shorter).'

function compassTag(
  name: string,
  extractionAxis: number,
  strengthAxis: number,
  hint: string,
) {
  return {
    name,
    category: 'Flavor',
    hint,
    extractionAxis: extractionAxis.toFixed(2),
    strengthAxis: strengthAxis.toFixed(2),
  } as const
}

const COMPASS_TAGS = [
  compassTag('Overwhelming', -0.9, 0.7, UNDER_EXTRACTED_HINT),
  compassTag('Intense', -0.8, 0.4, UNDER_EXTRACTED_HINT),
  compassTag('Salty', -0.6, 0.5, UNDER_EXTRACTED_HINT),
  compassTag('Quick Finish', -0.6, -0.1, UNDER_EXTRACTED_HINT),
  compassTag('Generic', -0.5, -0.2, UNDER_EXTRACTED_HINT),
  compassTag('Bland', -0.5, -0.4, UNDER_EXTRACTED_HINT),
  compassTag('Strong', -0.2, 0.9, SWEET_SPOT_HINT),
  compassTag('Robust', -0.1, 0.75, SWEET_SPOT_HINT),
  compassTag('Plump', 0, 0.65, SWEET_SPOT_HINT),
  compassTag('Transparent', 0.1, 0.55, SWEET_SPOT_HINT),
  compassTag('Balanced', 0, 0.4, SWEET_SPOT_HINT),
  compassTag('Rich', 0.25, 0.35, SWEET_SPOT_HINT),
  compassTag('Luscious', 0.3, 0.3, SWEET_SPOT_HINT),
  compassTag('Substantial', -0.2, 0.3, SWEET_SPOT_HINT),
  compassTag('Ripe', -0.1, 0.1, SWEET_SPOT_HINT),
  compassTag('Nuanced', 0.5, 0.1, SWEET_SPOT_HINT),
  compassTag('Tasty', 0.1, 0, SWEET_SPOT_HINT),
  compassTag('Fluffy', 0.55, 0, SWEET_SPOT_HINT),
  compassTag('Light', 0.2, -0.2, SWEET_SPOT_HINT),
  compassTag('Slender', 0.6, -0.1, OVER_EXTRACTED_HINT),
  compassTag('Delicate', 0.65, -0.2, OVER_EXTRACTED_HINT),
  compassTag('Empty', 0.8, -0.35, OVER_EXTRACTED_HINT),
  compassTag('Powdery', 0.55, -0.55, OVER_EXTRACTED_HINT),
] as const

export const TASTE_TAGS = [
  ...FLAVOR_WHEEL_TAGS.map((tag) =>
    tag.name === 'Fruity'
      ? {
          ...tag,
          hint: `${tag.hint} ${SWEET_SPOT_HINT}`,
          extractionAxis: '0.35',
          strengthAxis: '0.25',
        }
      : { ...tag, extractionAxis: null, strengthAxis: null },
  ),
  ...COMPASS_TAGS,
] as const
