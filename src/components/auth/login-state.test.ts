import { describe, expect, test } from 'bun:test'
import {
  type LoginStep,
  readMagicLink,
  restoreLoginDraft,
  serializeLoginDraft,
} from './login-state'

const now = 1_800_000_000_000

describe('sign-in recovery', () => {
  test('keeps an unfinished email when the page reloads', () => {
    const step: LoginStep = { kind: 'email', email: 'coffee+test@example.test' }
    expect(restoreLoginDraft(serializeLoginDraft(step), now)).toEqual(step)
  })

  test.each(['code', 'confirm'] as const)(
    'restores the code step without persisting a %s secret',
    (kind) => {
      const saved = serializeLoginDraft({
        kind,
        email: 'coffee@example.test',
        code: '92741586',
        sentAt: now - 30_000,
      })
      expect(saved).not.toContain('92741586')
      expect(restoreLoginDraft(saved, now)).toEqual({
        kind: 'code',
        email: 'coffee@example.test',
        code: '',
        sentAt: now - 30_000,
      })
    },
  )

  test.each([now - 600_000, now + 1])(
    'keeps the address but restarts expired or invalid delivery times',
    (sentAt) => {
      const saved = JSON.stringify({
        kind: 'code',
        email: 'coffee@example.test',
        sentAt,
      })
      expect(restoreLoginDraft(saved, now)).toEqual({
        kind: 'email',
        email: 'coffee@example.test',
      })
    },
  )

  test.each([null, '{', 'null', '{"kind":"confirm"}', 'x'.repeat(4097)])(
    'ignores an unusable saved draft',
    (saved) =>
      expect(restoreLoginDraft(saved, now)).toEqual({
        kind: 'email',
        email: '',
      }),
  )
})

describe('email sign-in links', () => {
  test('reads an encoded address and full code for explicit confirmation', () => {
    expect(
      readMagicLink('#email=coffee%2Btest%40example.test&code=01234567'),
    ).toEqual({
      kind: 'valid',
      email: 'coffee+test@example.test',
      code: '01234567',
    })
  })

  test('distinguishes an ordinary visit from an incomplete sign-in link', () => {
    expect(readMagicLink('')).toEqual({ kind: 'none' })
    for (const hash of [
      '#email=coffee%40example.test',
      '#email=invalid&code=01234567',
      '#email=coffee%40example.test&code=1234',
    ])
      expect(readMagicLink(hash)).toEqual({ kind: 'invalid' })
  })
})
