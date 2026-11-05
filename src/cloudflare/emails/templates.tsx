import type { AccountEmailContent as PublicContent } from '../../lib/account-email'
import { CodeBox, EmailLayout, Muted, Paragraph } from './layout'

export type AccountEmailContent =
  | PublicContent
  | { kind: 'export-ready'; url: string }
  | {
      kind: 'ai-quota-low'
      url: string
      used: number
      limit: number
      resetAt: Date
    }

export const EMAIL_KINDS = [
  'sign-in',
  'change-email',
  'verify-email',
  'delete-account',
  'export-ready',
  'ai-quota-low',
] as const satisfies readonly AccountEmailContent['kind'][]

export const EMAIL_VALUES = ['url', 'code', 'newEmail', 'used', 'limit', 'resetAt'] as const
type Values = Record<(typeof EMAIL_VALUES)[number], string>

export function template(kind: AccountEmailContent['kind'], v: Values) {
  const href = v.url
  switch (kind) {
    case 'sign-in':
      return {
        subject: 'Your Roastbook sign-in code',
        element: (
          <EmailLayout
            preview="Your secure link and code are ready. They expire in 10 minutes."
            title="Your journal is ready."
            action={{ label: 'Sign in to Roastbook', href }}
            note="Your code and link expire in 10 minutes and can only be used once."
            safety="Only continue if you requested this email. Never share your sign-in code or link. If this wasn’t you, you can safely ignore it."
          >
            <Paragraph>
              Use the code below, or open the secure link to continue on this
              device.
            </Paragraph>
            <CodeBox code={v.code} />
          </EmailLayout>
        ),
      }
    case 'change-email':
      return {
        subject: 'Approve your Roastbook email change',
        element: (
          <EmailLayout
            preview="Confirm the new email address for your coffee journal."
            title="A new address. Same journal."
            action={{ label: 'Approve email change', href }}
            note="Your account keeps its current email until verification is complete."
            safety="If you didn’t request this change, don’t approve it. Your email address will stay the same."
          >
            <Paragraph>
              You requested to change your Roastbook email address to{' '}
              <strong>{v.newEmail}</strong>. Approve it here, then verify
              the new address.
            </Paragraph>
          </EmailLayout>
        ),
      }
    case 'verify-email':
      return {
        subject: 'Verify your Roastbook email',
        element: (
          <EmailLayout
            preview="One last step to verify your coffee journal’s email address."
            title="Make yourself at home."
            action={{ label: 'Verify email address', href }}
            safety="If you didn’t request this email, you can safely ignore it."
          >
            <Paragraph>
              Confirm this email address to keep your Roastbook account secure.
            </Paragraph>
          </EmailLayout>
        ),
      }
    case 'delete-account':
      return {
        subject: 'Confirm deleting your Roastbook account',
        element: (
          <EmailLayout
            preview="Review the request to permanently delete your coffee journal."
            title="Before you close the book."
            tone="destructive"
            action={{ label: 'Review account deletion', href }}
            note="This link expires in 10 minutes. Confirmed deletion cannot be undone."
            safety="If you didn’t request this, ignore this email. Your account will remain active."
          >
            <Paragraph>
              You requested to permanently delete your Roastbook account, coffee
              journal, and stored images. Opening this email or link does not
              delete anything.
            </Paragraph>
          </EmailLayout>
        ),
      }
    case 'export-ready':
      return {
        subject: 'Your Roastbook export is ready',
        element: (
          <EmailLayout
            preview="Your journal archive is ready to download for the next 24 hours."
            title="Your journal, packed up."
            action={{ label: 'Download your export', href }}
            note="The download is available from your account settings for 24 hours."
          >
            <Paragraph>
              Your export contains your journal data and original pictures in one
              ZIP archive.
            </Paragraph>
          </EmailLayout>
        ),
      }
    case 'ai-quota-low':
      return {
        subject: 'You’re running low on free AI requests',
        element: (
          <EmailLayout
            preview={`${v.used} of ${v.limit} free AI requests used this week.`}
            title="Your free AI is almost used up."
            action={{ label: 'View AI settings', href }}
          >
            <Paragraph>
              You’ve used {v.used} of your {v.limit} free AI
              requests this week. They reset on{' '}
              {v.resetAt} at 00:00 UTC.
            </Paragraph>
            <Muted>
              Connect your own AI provider in Settings to keep going without a
              limit.
            </Muted>
          </EmailLayout>
        ),
      }
  }
}

