import rendered from './rendered.gen.json'
import type { AccountEmailContent } from './templates'

export type { AccountEmailContent } from './templates'

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

export async function renderAccountEmail(content: AccountEmailContent) {
  const link = new URL(content.url)
  if (
    !['https:', 'http:'].includes(link.protocol) ||
    link.username ||
    link.password
  )
    throw new Error('Invalid account email link')
  const values: Record<string, string> = { url: link.href }
  if (content.kind === 'sign-in') values.code = content.code
  if (content.kind === 'change-email') values.newEmail = content.newEmail
  if (content.kind === 'ai-quota-low')
    Object.assign(values, {
      used: String(content.used),
      limit: String(content.limit),
      resetAt: content.resetAt.toUTCString().slice(0, 16),
    })
  const fill = (source: string, escape: (value: string) => string) =>
    source.replace(/%%(\w+)%%/g, (_, name: string) => {
      const value = values[name]
      if (value === undefined) throw new Error(`Missing email value ${name}`)
      return escape(value)
    })
  const email = rendered[content.kind]
  return {
    subject: fill(email.subject, String),
    html: fill(email.html, escapeHtml),
    text: fill(email.text, String),
  }
}

export type AccountEmail = Awaited<ReturnType<typeof renderAccountEmail>>
