import '@tanstack/react-start/server-only'
import nodemailer from 'nodemailer'
import { getServerEnv } from '@/lib/env.server'

export async function sendAccountEmail(
  to: string,
  subject: string,
  text: string,
) {
  const env = getServerEnv()
  if (!env.EMAIL_FROM) throw new Error('EMAIL_FROM is required')
  if (env.EMAIL_PROVIDER === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new Error('Email delivery failed')
    return
  }
  if (!env.SMTP_URL) throw new Error('SMTP_URL is required')
  await nodemailer
    .createTransport(env.SMTP_URL)
    .sendMail({ from: env.EMAIL_FROM, to, subject, text })
}
