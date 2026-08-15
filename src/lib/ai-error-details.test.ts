import { describe, expect, test } from 'bun:test'
import { aiErrorMessage, aiErrorPayload } from '@/lib/ai-error-details'

describe('AI error details', () => {
  test('includes nested network causes in the summary and payload', () => {
    const cause = Object.assign(new Error('Name or service not known'), {
      code: 'ENOTFOUND',
      errno: -3008,
      syscall: 'getaddrinfo',
      hostname: 'ai.example.test',
    })
    const error = new TypeError('Failed to fetch', { cause })

    expect(aiErrorMessage(error)).toBe(
      'Failed to fetch: Name or service not known (ENOTFOUND)',
    )
    expect(aiErrorPayload(error)).toEqual({
      name: 'TypeError',
      message: 'Failed to fetch',
      cause: {
        name: 'Error',
        message: 'Name or service not known',
        code: 'ENOTFOUND',
        errno: -3008,
        syscall: 'getaddrinfo',
        hostname: 'ai.example.test',
      },
    })
  })

  test('keeps structured provider details without serializing headers', () => {
    const error = Object.assign(new Error('429 Rate limit exceeded'), {
      status: 429,
      code: 'rate_limit_exceeded',
      error: {
        message: 'Rate limit exceeded',
        type: 'requests',
        code: 'rate_limit_exceeded',
      },
      headers: { authorization: 'Bearer secret' },
    })

    expect(aiErrorPayload(error)).toEqual({
      name: 'Error',
      message: '429 Rate limit exceeded',
      code: 'rate_limit_exceeded',
      status: 429,
      providerError: {
        message: 'Rate limit exceeded',
        type: 'requests',
        code: 'rate_limit_exceeded',
      },
    })
  })
})
