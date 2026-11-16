import type { z } from 'zod'
import type { browserUsageEventSchema } from './contract'

export const browserUsageEvent = 'roastbook-usage-event'

/** Only live listeners receive actions; there is no queue or replay. */
export function reportBrowserUsage(
  event: z.infer<typeof browserUsageEventSchema>,
) {
  window.dispatchEvent(new CustomEvent(browserUsageEvent, { detail: event }))
}
