import { type BrowserUsageEvent, browserUsageEventSchema } from './contract'

export const browserUsageEvent = 'roastbook-usage-event'

/** Only live listeners receive actions; there is no queue or replay. */
export function reportBrowserUsage(event: BrowserUsageEvent) {
  window.dispatchEvent(new CustomEvent(browserUsageEvent, { detail: event }))
}

/** Validates explicit events and never queues offline activity. The caller owns consent. */
export function subscribeBrowserUsage(
  capture: (event: BrowserUsageEvent) => void,
) {
  const receive = (event: Event) => {
    if (!(event instanceof CustomEvent) || !navigator.onLine) return
    const parsed = browserUsageEventSchema.safeParse(event.detail)
    if (parsed.success) capture(parsed.data)
  }
  window.addEventListener(browserUsageEvent, receive)
  return () => window.removeEventListener(browserUsageEvent, receive)
}
