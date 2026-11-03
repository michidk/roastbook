import '@tanstack/react-start/server-only'
import { requireCloudflareRuntime } from './context.server'

export async function sendCloudflareAccountEmail(
  to: string,
  subject: string,
  text: string,
) {
  try {
    const response =
      await requireCloudflareRuntime().bindings.ACCOUNT_EMAIL.fetch(
        'https://account-email.internal/send',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, subject, text }),
        },
      )
    await response.body?.cancel()
    if (!response.ok) throw new Error('Email delivery failed')
  } catch {
    throw new Error('Email delivery failed')
  }
}
