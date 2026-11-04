import { z } from 'zod'

export const SIGN_IN_CODE_LENGTH = 6
export const SIGN_IN_LIFETIME_MS = 10 * 60 * 1000

export const signInLinkTokenSchema = z
  .string()
  .max(2051)
  .regex(/^v1\.[a-f0-9]{80,2048}$/)

export const signInLinkPayloadSchema = z
  .object({
    email: z.email().max(320),
    code: z.string().regex(/^\d{6}$/),
    sentAt: z.number().int().nonnegative(),
  })
  .strict()
