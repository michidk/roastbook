import '@tanstack/react-start/server-only'
import { hkdfSync } from 'node:crypto'
import type { BetterAuthPlugin } from 'better-auth'
import {
  APIError,
  createAuthEndpoint,
  formCsrfMiddleware,
} from 'better-auth/api'
import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto'
import { z } from 'zod'
import {
  SIGN_IN_LIFETIME_MS,
  signInLinkPayloadSchema,
  signInLinkTokenSchema,
} from '@/modules/auth/sign-in-link'

type LinkContext = { origin: string; secret: string }

function encryptionKey({ origin, secret }: LinkContext) {
  return Buffer.from(
    hkdfSync('sha256', secret, origin, 'roastbook:email-sign-in:v1', 32),
  ).toString('base64')
}

export async function createSignInLinkToken({
  email,
  code,
  sentAt = Date.now(),
  ...context
}: LinkContext & z.infer<typeof signInLinkPayloadSchema>) {
  const payload = signInLinkPayloadSchema.parse({ email, code, sentAt })
  return `v1.${await symmetricEncrypt({
    key: encryptionKey(context),
    data: JSON.stringify(payload),
  })}`
}

export async function resolveSignInLinkToken({
  token,
  now = Date.now(),
  ...context
}: LinkContext & { token: string; now?: number }) {
  try {
    const ciphertext = signInLinkTokenSchema.parse(token).slice(3)
    const plaintext = await symmetricDecrypt({
      key: encryptionKey(context),
      data: ciphertext,
    })
    const payload = signInLinkPayloadSchema.parse(JSON.parse(plaintext))
    if (payload.sentAt > now || now - payload.sentAt >= SIGN_IN_LIFETIME_MS)
      throw new Error('Expired link')
    return payload
  } catch {
    throw new Error(
      'This sign-in link is invalid or expired. Request a new email.',
    )
  }
}

export function emailSignInLinkPlugin(context: LinkContext) {
  return {
    id: 'roastbook-email-sign-in-link',
    endpoints: {
      resolveEmailSignInLink: createAuthEndpoint(
        '/email-otp/resolve-sign-in-link',
        {
          method: 'POST',
          use: [formCsrfMiddleware],
          body: z.object({ token: signInLinkTokenSchema }),
        },
        async (ctx) => {
          try {
            return ctx.json(
              await resolveSignInLinkToken({
                ...context,
                token: ctx.body.token,
              }),
            )
          } catch {
            throw new APIError('BAD_REQUEST', {
              message:
                'This sign-in link is invalid or expired. Request a new email.',
            })
          }
        },
      ),
    },
  } satisfies BetterAuthPlugin
}
