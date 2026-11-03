import { describe, expect, test } from 'bun:test'
import {
  createSignInLinkToken,
  resolveSignInLinkToken,
} from './sign-in-link.server'

const context = {
  secret: 'isolated-unit-test-secret-with-at-least-32-characters',
  origin: 'https://journal.example.test',
}
const payload = {
  email: 'coffee+private@example.test',
  code: '01234567',
  sentAt: 1_800_000_000_000,
}

describe('private email sign-in links', () => {
  test('encrypts both email and OTP with a fresh nonce for every link', async () => {
    const token = await createSignInLinkToken({ ...context, ...payload })
    expect(token).not.toContain(payload.email)
    expect(token).not.toContain(payload.code)
    expect(token).not.toBe(
      await createSignInLinkToken({ ...context, ...payload }),
    )
    expect(
      await resolveSignInLinkToken({
        ...context,
        token,
        now: payload.sentAt + 599_999,
      }),
    ).toEqual(payload)
  })

  test('rejects modification, the wrong instance or secret, and expiry', async () => {
    const token = await createSignInLinkToken({ ...context, ...payload })
    const base = { ...context, token, now: payload.sentAt }
    for (const input of [
      {
        ...base,
        token: `${token.slice(0, -2)}${token.endsWith('00') ? 'ff' : '00'}`,
      },
      { ...base, origin: 'https://another.example.test' },
      {
        ...base,
        secret: 'another-isolated-secret-with-at-least-32-characters',
      },
      { ...base, now: payload.sentAt + 600_000 },
      { ...base, now: payload.sentAt - 1 },
      { ...base, token: 'v1.invalid' },
      { ...base, token: `v1.${'ab'.repeat(1025)}` },
    ]) {
      await expect(resolveSignInLinkToken(input)).rejects.toThrow(
        'This sign-in link is invalid or expired. Request a new email.',
      )
    }
  })
})
