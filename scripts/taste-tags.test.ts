import { describe, expect, test } from 'bun:test'
import { TASTE_TAGS } from './taste-tags'

describe('default taste tags', () => {
  test('stores neutral dial-in guidance for the LLM', () => {
    expect(TASTE_TAGS.every((tag) => tag.llmInstruction.length > 0)).toBe(true)
    expect(
      TASTE_TAGS.every((tag) =>
        tag.llmInstruction.includes('when suggesting dial-in changes'),
      ),
    ).toBe(true)
    expect(
      TASTE_TAGS.every((tag) => !/\bcompass\b/i.test(tag.llmInstruction)),
    ).toBe(true)
  })

  test('does not duplicate the dedicated sensory ratings', () => {
    const names = new Set(TASTE_TAGS.map((tag) => tag.name.toLowerCase()))
    for (const coveredRating of [
      'bitter',
      'bitterness',
      'sour',
      'acidity',
      'sweetness',
      'body',
      'astringent',
      'astringency',
      'dryness',
      'thin',
      'full',
    ]) {
      expect(names.has(coveredRating)).toBe(false)
    }
  })
})
