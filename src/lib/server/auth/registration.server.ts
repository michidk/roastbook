import '@tanstack/react-start/server-only'
import type { ServerEnv } from '@/lib/env.server'

export const isAdminEmail = (env: ServerEnv, email: string) =>
  env.AUTH_ADMIN_EMAIL.includes(email.toLowerCase())

/** Whether a new account may be created for this address. Admins are always allowed. */
export const mayRegister = (env: ServerEnv, email: string) =>
  env.AUTH_SIGNUP_ENABLED ||
  isAdminEmail(env, email) ||
  env.AUTH_ALLOWED_EMAILS.includes(email.toLowerCase())
