import '@tanstack/react-start/server-only'
import { getServerEnv } from '@/lib/env.server'
import { logEvent } from './analytics.server'
import { sendCloudflareAccountEmail } from './email.server'
import {
  type AccountEmailContent,
  renderAccountEmail,
} from './emails/account-email'

type Content = DistributiveOmit<AccountEmailContent, 'url'>
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

/** Best effort: a notification must never fail the work that triggered it. */
export async function notifyUser(to: string, path: string, content: Content) {
  try {
    const url = new URL(path, getServerEnv().AUTH_URL).href
    await sendCloudflareAccountEmail(
      to,
      await renderAccountEmail({ ...content, url } as AccountEmailContent),
    )
  } catch {
    logEvent('error', 'hosted_email_failed', { kind: content.kind })
  }
}
