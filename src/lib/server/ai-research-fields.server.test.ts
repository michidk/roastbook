import { describe, expect, test } from 'bun:test'
import {
  BEAN_IMAGE_INFO_FIELDS,
  beanInfoPrompt,
} from '@/lib/server/ai-research-fields.server'
import { parseStructuredResearchResult } from '@/lib/structured-research'

describe('bean image research fields', () => {
  test('requests bag weight and supports omni coffee', () => {
    const prompt = beanInfoPrompt('Extract package details.', 'Do not guess.')

    expect(prompt).toContain(
      'weight: The net weight of the coffee bag in grams',
    )
    expect(prompt).toContain('"espresso", "filter", "omni", "decaf"')
  })

  test('parses bag weight and omni type from an image result', () => {
    expect(
      parseStructuredResearchResult(
        JSON.stringify({ weight: '250', type: 'omni' }),
        BEAN_IMAGE_INFO_FIELDS,
      ),
    ).toEqual({ weight: '250', type: 'omni' })
  })

  test.each(['0', '-250', '10000', '250.123', '250 g'])(
    'drops invalid bag weight %s',
    (weight) => {
      expect(
        parseStructuredResearchResult(
          JSON.stringify({ weight }),
          BEAN_IMAGE_INFO_FIELDS,
        ),
      ).toEqual({})
    },
  )
})
