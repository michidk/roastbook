// Instructions give the LLM sensory context and neutral dial-in guidance.
// Extraction and strength coordinates remain internal presentation metadata.
export const TASTE_TAGS = [
  {
    name: 'Fruity',
    category: 'Flavor',
    llmInstruction:
      'Use for a general ripe-fruit aroma when no more specific fruit family fits. Treat it as somewhat under-extracted and medium in strength when suggesting dial-in changes.',
    extractionAxis: '0.3',
    strengthAxis: '0.5',
  },
  {
    name: 'Berry',
    category: 'Flavor',
    llmInstruction:
      'Use for strawberry, raspberry, blueberry, or blackberry-like aromas. Treat it as somewhat under-extracted and medium in strength when suggesting dial-in changes.',
    extractionAxis: '0.3',
    strengthAxis: '0.5',
  },
  {
    name: 'Dried fruit',
    category: 'Flavor',
    llmInstruction:
      'Use for raisin, prune, date, or dried-berry aromas. Treat it as slightly under-extracted and moderately strong when suggesting dial-in changes.',
    extractionAxis: '0.4',
    strengthAxis: '0.6',
  },
  {
    name: 'Citrus',
    category: 'Flavor',
    llmInstruction:
      'Use for lemon, lime, orange, grapefruit, or citrus-peel aromas. Treat it as slightly under-extracted and moderately light when suggesting dial-in changes.',
    extractionAxis: '0.4',
    strengthAxis: '0.4',
  },
  {
    name: 'Stone fruit',
    category: 'Flavor',
    llmInstruction:
      'Use for peach, apricot, plum, nectarine, or cherry-like aromas. Treat it as somewhat under-extracted and medium in strength when suggesting dial-in changes.',
    extractionAxis: '0.35',
    strengthAxis: '0.5',
  },
  {
    name: 'Tropical fruit',
    category: 'Flavor',
    llmInstruction:
      'Use for pineapple, mango, papaya, passion fruit, or coconut-like aromas. Treat it as somewhat under-extracted and slightly strong when suggesting dial-in changes.',
    extractionAxis: '0.35',
    strengthAxis: '0.55',
  },
  {
    name: 'Floral',
    category: 'Flavor',
    llmInstruction:
      'Use for jasmine, rose, chamomile, or tea-like aromas. Treat it as under-extracted and light when suggesting dial-in changes.',
    extractionAxis: '0.2',
    strengthAxis: '0.3',
  },
  {
    name: 'Chocolate',
    category: 'Flavor',
    llmInstruction:
      'Use for milk chocolate, dark chocolate, or cocoa-like aromas. Treat it as slightly over-extracted and strong when suggesting dial-in changes.',
    extractionAxis: '0.6',
    strengthAxis: '0.7',
  },
  {
    name: 'Nutty',
    category: 'Flavor',
    llmInstruction:
      'Use for almond, hazelnut, peanut, or walnut-like aromas. Treat it as balanced in extraction and moderately strong when suggesting dial-in changes.',
    extractionAxis: '0.5',
    strengthAxis: '0.6',
  },
  {
    name: 'Caramel',
    category: 'Flavor',
    llmInstruction:
      'Use for caramelized, honey, molasses, or maple-like sweet aromatics. Treat it as slightly over-extracted and moderately strong when suggesting dial-in changes.',
    extractionAxis: '0.6',
    strengthAxis: '0.6',
  },
  {
    name: 'Vanilla',
    category: 'Flavor',
    llmInstruction:
      'Use for vanilla, marshmallow, or custard-like sweet aromatics. Treat it as balanced in extraction and strength when suggesting dial-in changes.',
    extractionAxis: '0.5',
    strengthAxis: '0.5',
  },
  {
    name: 'Spicy',
    category: 'Flavor',
    llmInstruction:
      'Use for cinnamon, clove, nutmeg, anise, or pepper-like aromas. Treat it as over-extracted and moderately strong when suggesting dial-in changes.',
    extractionAxis: '0.7',
    strengthAxis: '0.6',
  },
  {
    name: 'Roasted',
    category: 'Flavor',
    llmInstruction:
      'Use for toasted, coffee-like, smoky, or tobacco-like aromas. Treat it as distinctly over-extracted and strong when suggesting dial-in changes.',
    extractionAxis: '0.75',
    strengthAxis: '0.75',
  },
  {
    name: 'Cereal',
    category: 'Flavor',
    llmInstruction:
      'Use for grain, malt, or fresh-bread aromas. Treat it as slightly over-extracted and slightly light when suggesting dial-in changes.',
    extractionAxis: '0.55',
    strengthAxis: '0.45',
  },
  {
    name: 'Green / vegetative',
    category: 'Flavor',
    llmInstruction:
      'Use for fresh, herbal, peapod, hay, or unripe-plant aromas. Treat it as under-extracted and moderately light when suggesting dial-in changes.',
    extractionAxis: '0.25',
    strengthAxis: '0.4',
  },
  {
    name: 'Earthy',
    category: 'Flavor',
    llmInstruction:
      'Use for soil, damp wood, or dusty aromas. Treat it as over-extracted and strong when suggesting dial-in changes.',
    extractionAxis: '0.7',
    strengthAxis: '0.7',
  },
  {
    name: 'Fermented',
    category: 'Flavor',
    llmInstruction:
      'Use for winey, overripe, or alcohol-like aromas, separate from acidity intensity. Treat it as near-balanced in extraction and strong when suggesting dial-in changes.',
    extractionAxis: '0.45',
    strengthAxis: '0.7',
  },
  {
    name: 'Woody',
    category: 'Flavor',
    llmInstruction:
      'Use for dry wood, bark, cedar, or pencil-shaving aromas. Treat it as over-extracted and slightly strong when suggesting dial-in changes.',
    extractionAxis: '0.7',
    strengthAxis: '0.55',
  },
] as const
