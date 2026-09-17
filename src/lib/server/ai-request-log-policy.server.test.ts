import { describe, expect, test } from 'bun:test'
import {
  storedAiErrorMessage,
  storedAiPayload,
} from '@/lib/server/ai-request-log-policy.server'

const minimizedPolicy = {
  storePayloads: false,
  retentionDays: 1,
  maxPayloadBytes: 65_536,
}

describe('AI request log policy', () => {
  test('redacts prompts and provider errors by default', () => {
    expect(
      storedAiPayload(
        { messages: [{ content: 'private brew notes' }] },
        minimizedPolicy,
      ),
    ).toEqual({ redacted: true })
    expect(
      storedAiErrorMessage('provider secret response', minimizedPolicy),
    ).toBe('AI request failed')
  })

  test('caps payloads when short-lived debugging is enabled', () => {
    const policy = {
      ...minimizedPolicy,
      storePayloads: true,
      maxPayloadBytes: 32,
    }

    expect(storedAiPayload({ content: 'short' }, policy)).toEqual({
      content: 'short',
    })
    expect(
      storedAiPayload({ content: 'private provider output'.repeat(4) }, policy),
    ).toMatchObject({ redacted: true, reason: 'payload_too_large' })
  })
})
