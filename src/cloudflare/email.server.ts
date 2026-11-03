import '@tanstack/react-start/server-only'
import type { AccountEmail } from '@/lib/account-email'
import { requireCloudflareRuntime } from './context.server'

export async function sendCloudflareAccountEmail(
  to: string,
  message: AccountEmail,
) {
  try {
    const response =
      await requireCloudflareRuntime().bindings.ACCOUNT_EMAIL.fetch(
        'https://account-email.internal/send',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, ...message }),
        },
      )
    await response.body?.cancel()
    if (!response.ok) throw new Error('Email delivery failed')
  } catch {
    throw new Error('Email delivery failed')
  }
}
