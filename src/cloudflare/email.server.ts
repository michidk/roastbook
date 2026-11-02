import '@tanstack/react-start/server-only'
import { getServerEnv } from '@/lib/env.server'
import { requireCloudflareRuntime } from './context.server'

export async function sendCloudflareAccountEmail(
  to: string,
  subject: string,
  text: string,
) {
  const from = getServerEnv().EMAIL_FROM
  if (!from) throw new Error('EMAIL_FROM is required')
  try {
    await requireCloudflareRuntime().bindings.EMAIL.send({
      from,
      to,
      subject,
      text,
    })
  } catch {
    throw new Error('Email delivery failed')
  }
}
