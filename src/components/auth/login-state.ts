import { z } from 'zod'
import {
  SIGN_IN_LIFETIME_MS,
  signInLinkTokenSchema,
} from '@/modules/auth/sign-in-link'

export const LOGIN_DRAFT_KEY = 'roastbook-sign-in'
export const RESEND_DELAY_MS = 60_000
const emailSchema = z.email().max(320)
const emailDraft = z.object({
  kind: z.literal('email'),
  email: z.string().max(320),
})
const codeDraft = z.object({
  kind: z.literal('code'),
  email: emailSchema,
  sentAt: z.number().int().nonnegative(),
})
const draftSchema = z.discriminatedUnion('kind', [emailDraft, codeDraft])

export type LoginStep =
  | z.infer<typeof emailDraft>
  | (z.infer<typeof codeDraft> & { code: string })
  | { kind: 'confirm'; email: string; code: string; sentAt: number }
  // The code is valid, but no account exists for the address yet.
  | { kind: 'create'; email: string; code: string; sentAt: number }

export function restoreLoginDraft(raw: string | null, now: number): LoginStep {
  const empty: LoginStep = { kind: 'email', email: '' }
  if (!raw || raw.length > 4096) return empty
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return empty
    const draft = parsed.data
    if (draft.kind === 'email') return draft
    if (draft.sentAt > now || now - draft.sentAt >= SIGN_IN_LIFETIME_MS)
      return { kind: 'email', email: draft.email }
    return { ...draft, code: '' }
  } catch {
    return empty
  }
}

export function serializeLoginDraft(step: LoginStep) {
  // Keep the address and delivery time across reloads, never the secret code.
  return JSON.stringify(
    step.kind === 'email'
      ? { kind: 'email', email: step.email }
      : { kind: 'code', email: step.email, sentAt: step.sentAt },
  )
}

export function readMagicLink(hash: string) {
  if (!hash) return { kind: 'none' } as const
  const fields = new URLSearchParams(hash.slice(1))
  const parsed = signInLinkTokenSchema.safeParse(fields.get('sign-in'))
  return parsed.success
    ? ({ kind: 'valid', token: parsed.data } as const)
    : ({ kind: 'invalid' } as const)
}
