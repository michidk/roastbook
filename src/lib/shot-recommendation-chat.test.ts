import { describe, expect, test } from 'bun:test'
import type { ShotRecommendation } from '@/lib/shot-recommendation'
import {
  buildShotRecommendationChatMessages,
  parseShotRecommendationAnswer,
  SHOT_RECOMMENDATION_CHAT_MAX_MESSAGES,
  shotRecommendationAnswerSchema,
  shotRecommendationAnswerToText,
  shotRecommendationChatRequestSchema,
} from '@/lib/shot-recommendation-chat'

const recommendation: ShotRecommendation = {
  diagnosis: 'balanced',
  confidence: 'medium',
  headline: 'Keep it as is',
  reasoning: ['Recent brews are well balanced.'],
  historyInsight: 'Ratings improved after the finer grind.',
  changes: [],
  keepConstant: [],
  caveat: 'Only three rated brews.',
  followUpQuestions: [
    'Why this change?',
    'Could I adjust the grind instead?',
    'How do I test it?',
  ],
}

const context = {
  bean: { name: 'Test bean' },
  brewingMethod: { name: 'Espresso' },
  exactGear: {},
  enabledParameters: ['grindSetting'],
  matchingShotCount: 1,
  historyIncluded: 1,
  historyTruncated: false,
  shotsOldestToNewest: [{ id: 1 }],
}

const question = { role: 'user', content: 'Could I grind finer instead?' }

describe('recommendation follow-up chat', () => {
  test('accepts a conversation that ends with a question', () => {
    const parsed = shotRecommendationChatRequestSchema.parse({
      request: { shotId: 7 },
      recommendation,
      messages: [
        question,
        { role: 'assistant', content: 'Possibly.' },
        { role: 'user', content: '  By how much?  ' },
      ],
    })

    expect(parsed.messages.at(-1)?.content).toBe('By how much?')
  })

  test('rejects an empty thread, a trailing answer, and an overlong thread', () => {
    const base = { request: { shotId: 7 }, recommendation }
    const answer = { role: 'assistant', content: 'Possibly.' }

    expect(
      shotRecommendationChatRequestSchema.safeParse({ ...base, messages: [] })
        .success,
    ).toBe(false)
    expect(
      shotRecommendationChatRequestSchema.safeParse({
        ...base,
        messages: [question, answer],
      }).success,
    ).toBe(false)
    expect(
      shotRecommendationChatRequestSchema.safeParse({
        ...base,
        messages: Array.from(
          { length: SHOT_RECOMMENDATION_CHAT_MAX_MESSAGES + 1 },
          (_, index) => (index % 2 === 0 ? question : answer),
        ),
      }).success,
    ).toBe(false)
  })

  test('grounds the conversation in the evidence and the given recommendation', () => {
    const { systemPrompts, messages } = buildShotRecommendationChatMessages(
      context,
      recommendation,
      [{ role: 'user', content: question.content }],
    )

    expect(systemPrompts).toHaveLength(1)
    expect(messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'user',
    ])
    expect(messages[0]?.content).toContain('"name": "Test bean"')
    expect(messages[1]?.content).toBe(JSON.stringify(recommendation))
    expect(messages[2]?.content).toBe(question.content)
  })

  test('accepts structured answers and renders them as history text', () => {
    const answer = shotRecommendationAnswerSchema.parse({
      blocks: [
        { type: 'text', text: 'A finer [[grindSetting]] extracts more.' },
        {
          type: 'change',
          parameter: 'grindSetting',
          currentValue: '12',
          recommendedValue: 'one step finer',
          reason: 'Test one variable.',
        },
        {
          type: 'keep',
          parameter: 'doseGrams',
          currentValue: '18 g',
          reason: 'Fixed.',
        },
        { type: 'note', text: 'Taste before changing more.' },
      ],
    })

    expect(shotRecommendationAnswerToText(answer)).toBe(
      [
        'A finer [[grindSetting]] extracts more.',
        'Change [[grindSetting]] from 12 to one step finer: Test one variable.',
        'Keep [[doseGrams]] at 18 g: Fixed.',
        'Note: Taste before changing more.',
      ].join('\n\n'),
    )
  })

  test('rejects empty answers and unknown block types or parameters', () => {
    const parse = (blocks: unknown) =>
      shotRecommendationAnswerSchema.safeParse({ blocks }).success

    expect(parse([])).toBe(false)
    expect(parse([{ type: 'table', text: 'x' }])).toBe(false)
    expect(
      parse([
        {
          type: 'change',
          parameter: 'beanId',
          currentValue: '1',
          recommendedValue: '2',
          reason: 'x',
        },
      ]),
    ).toBe(false)
  })

  test('turns the flat model answer into typed blocks and drops broken ones', () => {
    const empty = {
      text: null,
      parameter: null,
      currentValue: null,
      recommendedValue: null,
      reason: null,
    }

    expect(
      parseShotRecommendationAnswer({
        blocks: [
          { ...empty, type: 'text', text: 'Try a finer grind.' },
          {
            ...empty,
            type: 'change',
            parameter: 'grindSetting',
            currentValue: '12',
          },
          {
            ...empty,
            type: 'change',
            parameter: 'grindSetting',
            currentValue: '12',
            recommendedValue: 'one step finer',
            reason: 'One variable.',
          },
        ],
      }).blocks,
    ).toEqual([
      { type: 'text', text: 'Try a finer grind.' },
      {
        type: 'change',
        parameter: 'grindSetting',
        currentValue: '12',
        recommendedValue: 'one step finer',
        reason: 'One variable.',
      },
    ])
    expect(() =>
      parseShotRecommendationAnswer({
        blocks: [{ ...empty, type: 'keep', parameter: 'doseGrams' }],
      }),
    ).toThrow()
  })
})
