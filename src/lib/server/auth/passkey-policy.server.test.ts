import { describe, expect, test } from 'bun:test'
import { requirePasskeyUserVerification } from './passkey-policy.server'

function assertion(flags: number) {
  const bytes = Buffer.alloc(37)
  bytes[32] = flags
  return {
    response: { response: { authenticatorData: bytes.toString('base64url') } },
  }
}
describe('passkey device verification policy', () => {
  test('requires the signed user verification flag, even if presence succeeded', () => {
    expect(() =>
      requirePasskeyUserVerification(
        '/passkey/verify-authentication',
        assertion(1),
      ),
    ).toThrow('Unlock your device')
    expect(() =>
      requirePasskeyUserVerification(
        '/passkey/verify-authentication',
        assertion(5),
      ),
    ).not.toThrow()
  })
  test('rejects missing or malformed authenticator data', () => {
    for (const body of [
      null,
      {},
      { response: { response: { authenticatorData: 'bad' } } },
    ]) {
      expect(() =>
        requirePasskeyUserVerification('/passkey/verify-authentication', body),
      ).toThrow()
    }
    expect(() =>
      requirePasskeyUserVerification('/passkey/verify-registration', {
        response: { response: { attestationObject: 'bad' } },
      }),
    ).toThrow()
  })
  test('leaves unrelated authentication endpoints to Better Auth', () => {
    expect(() =>
      requirePasskeyUserVerification('/sign-in/email-otp', {}),
    ).not.toThrow()
  })
})
