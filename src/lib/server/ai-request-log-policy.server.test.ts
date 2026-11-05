import { describe, expect, test } from 'bun:test'
import {
  storedAiErrorMessage,
  storedAiPayload,
} from '@/lib/server/ai-request-log-policy.server'

describe('AI request log policy', () => {
  test('redacts prompts and provider errors by default', () => {
    const policy = { storePayloads: false }
    expect(
      storedAiPayload(
        { messages: [{ content: 'private brew notes' }] },
        policy,
      ),
    ).toEqual({ redacted: true })
    expect(storedAiErrorMessage('provider secret response', policy)).toBe(
      'AI request failed',
    )
  })

  test('stores payloads when enabled', () => {
    expect(
      storedAiPayload({ content: 'short' }, { storePayloads: true }),
    ).toEqual({ content: 'short' })
  })
})
