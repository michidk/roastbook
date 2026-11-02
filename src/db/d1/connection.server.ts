import '@tanstack/react-start/server-only'
import { drizzle } from 'drizzle-orm/d1'
import { requireCloudflareRuntime } from '@/cloudflare/context.server'
import * as schema from './schema'

/** Bindings are resolved inside each invocation, never during module loading. */
export function getControlDb() {
  return drizzle(requireCloudflareRuntime().bindings.DB, { schema })
}
export function getJournalDb() {
  return getControlDb()
}
export function getAiControlDb() {
  return getControlDb()
}
export function getOAuthLockDb() {
  return getControlDb()
}
