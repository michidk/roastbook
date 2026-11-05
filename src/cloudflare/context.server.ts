import '@tanstack/react-start/server-only'
import { AsyncLocalStorage } from 'node:async_hooks'
import type {
  D1Database,
  DurableObjectNamespace,
  Fetcher,
  ImagesBinding,
  R2Bucket,
} from '@cloudflare/workers-types'

export interface CloudflareRuntimeBindings {
  OAUTH_COORDINATOR: DurableObjectNamespace
  DB: D1Database
  MEDIA: R2Bucket
  ACCOUNT_JOBS: DurableObjectNamespace
  ACCOUNT_EMAIL: Fetcher
  IMAGES: ImagesBinding
  AUTH_URL: string
  [name: string]: unknown
}

const runtime = new AsyncLocalStorage<{
  bindings: CloudflareRuntimeBindings
  variables: Record<string, string | undefined>
  request?: Request
  waitUntil?: (promise: Promise<unknown>) => void
}>()

export function withCloudflareRuntime<T>(
  bindings: CloudflareRuntimeBindings,
  work: () => T,
  invocation: {
    request?: Request
    waitUntil?: (promise: Promise<unknown>) => void
  } = {},
): T {
  const variables: Record<string, string | undefined> = {}
  for (const [name, value] of Object.entries(bindings)) {
    if (typeof value === 'string') variables[name] = value
  }
  return runtime.run({ bindings, variables, ...invocation }, work)
}

export function getCloudflareRuntime() {
  return runtime.getStore()
}

export function requireCloudflareRuntime() {
  const current = getCloudflareRuntime()
  if (!current) throw new Error('Cloudflare runtime context is required')
  return current
}
