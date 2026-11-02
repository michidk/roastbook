import { z } from 'zod'

export const LOGIN_DRAFT_KEY = 'roastbook-sign-in'
export const RESEND_DELAY_MS = 60_000
const CODE_LIFETIME_MS = 600_000
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
const magicLinkSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{8}$/),
})

export type LoginStep =
  | z.infer<typeof emailDraft>
  | (z.infer<typeof codeDraft> & { code: string })
  | { kind: 'confirm'; email: string; code: string; sentAt: number }

export function restoreLoginDraft(raw: string | null, now: number): LoginStep {
  const empty: LoginStep = { kind: 'email', email: '' }
  if (!raw || raw.length > 4096) return empty
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return empty
    const draft = parsed.data
    if (draft.kind === 'email') return draft
    if (draft.sentAt > now || now - draft.sentAt >= CODE_LIFETIME_MS)
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
  const parsed = magicLinkSchema.safeParse({
    email: fields.get('email'),
    code: fields.get('code'),
  })
  return parsed.success
    ? ({ kind: 'valid', ...parsed.data } as const)
    : ({ kind: 'invalid' } as const)
}
