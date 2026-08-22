import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import {
  buildStructuredResearchPrompt,
  defineStructuredResearchFields,
  parseStructuredResearchResult,
} from '@/lib/structured-research'

const fields = defineStructuredResearchFields({
  status: {
    description: 'The current lifecycle status.',
    jsonType: 'string',
    schema: z.enum(['active', 'retired']),
    options: ['active', 'retired'],
    examples: ['active', 'retired'],
  },
  score: {
    description: 'The review score.',
    jsonType: 'number',
    format: 'integer from 0 through 100',
    schema: z.number().int().min(0).max(100),
    examples: [87, 95],
  },
})

describe('structured research contracts', () => {
  test('puts names, types, formats, options, and examples in the prompt', () => {
    const prompt = buildStructuredResearchPrompt({
      role: 'You are a product researcher',
      task: 'Research the specified product.',
      fields,
      evidenceRules: ['Use the manufacturer as the primary source.'],
    })

    expect(prompt).toContain('status: The current lifecycle status.')
    expect(prompt).toContain('JSON type: string')
    expect(prompt).toContain('allowed values: "active", "retired"')
    expect(prompt).toContain('examples: "active", "retired"')
    expect(prompt).toContain('format: integer from 0 through 100')
  })

  test('keeps valid fields and drops invalid or undeclared properties', () => {
    const result = parseStructuredResearchResult(
      JSON.stringify({
        status: 'unknown',
        score: 95,
        undeclared: true,
      }),
      fields,
    )

    expect(result).toEqual({ score: 95 })
  })

  test('returns an empty result for non-JSON output', () => {
    expect(parseStructuredResearchResult('not JSON', fields)).toEqual({})
  })

  test.each(['null', '[]', '"text"'])(
    'returns an empty result for non-object JSON %s',
    (content) => {
      expect(parseStructuredResearchResult(content, fields)).toEqual({})
    },
  )

  test('parses JSON wrapped in a Markdown code fence', () => {
    const result = parseStructuredResearchResult(
      `Here are the researched values:
\`\`\`json
{
  "status": "active",
  "score": 95
}
\`\`\``,
      fields,
    )

    expect(result).toEqual({ status: 'active', score: 95 })
  })

  test('parses a valid JSON object surrounded by model commentary', () => {
    const result = parseStructuredResearchResult(
      `I found these values:
{"status":"active","score":95}
Hope this helps.`,
      fields,
    )

    expect(result).toEqual({ status: 'active', score: 95 })
  })
})
