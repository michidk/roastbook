import '@tanstack/react-start/server-only'
import {
  decodeAttestationObject,
  parseAuthenticatorData,
} from '@simplewebauthn/server/helpers'
import { z } from 'zod'

const encodedData = z
  .string()
  .min(1)
  .max(32_768)
  .regex(/^[A-Za-z0-9_-]+$/)
const registration = z.object({
  response: z.object({
    response: z.object({ attestationObject: encodedData }),
  }),
})
const authentication = z.object({
  response: z.object({
    response: z.object({ authenticatorData: encodedData }),
  }),
})

/** Better Auth 1.7 verifies signatures but does not require the signed UV flag. */
export function requirePasskeyUserVerification(path: string, body: unknown) {
  if (
    path !== '/passkey/verify-registration' &&
    path !== '/passkey/verify-authentication'
  )
    return
  const data =
    path === '/passkey/verify-registration'
      ? decodeAttestationObject(
          new Uint8Array(
            Buffer.from(
              registration.parse(body).response.response.attestationObject,
              'base64url',
            ),
          ),
        ).get('authData')
      : new Uint8Array(
          Buffer.from(
            authentication.parse(body).response.response.authenticatorData,
            'base64url',
          ),
        )
  if (!parseAuthenticatorData(data).flags.uv)
    throw new Error('Unlock your device to use a passkey')
}
