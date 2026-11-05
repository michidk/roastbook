import type { IntegrationRateLimit } from '@/modules/integrations/rate-limit'
import type { INTEGRATION_OPERATIONS } from './operations.server'

type Operation = (typeof INTEGRATION_OPERATIONS)[number]

// The HTTP boundary sends null for handlers without a return value. The schema
// generator represents Date values as the ISO strings JSON.stringify sends.
type JsonResult<T> = T extends Date
  ? Date
  : T extends void
    ? null
    : T extends object
      ? { [K in keyof T]: JsonResult<T[K]> }
      : T

type IntegrationResponses = {
  [O in Operation as O['name'] extends 'get_image'
    ? never
    : O['name']]: JsonResult<Awaited<ReturnType<O['run']>>>
}

export type IntegrationResponseSchemas = {
  operations: IntegrationResponses
  rateLimit: IntegrationRateLimit
}
