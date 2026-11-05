/** One fixed rate-limit window of the account's API and MCP allowance. */
export type IntegrationRateLimitWindow = {
  readonly window: 'minute' | 'day'
  readonly limit: number
  readonly used: number
  readonly remaining: number
  /** ISO timestamp when the window starts over. */
  readonly resetAt: string
}

export type IntegrationRateLimit = {
  readonly allowed: boolean
  readonly windows: readonly IntegrationRateLimitWindow[]
}

export const RATE_LIMIT_WINDOW_LABELS = {
  minute: 'This minute',
  day: 'Today (UTC)',
} as const satisfies Record<IntegrationRateLimitWindow['window'], string>

/** How close a window is to its limit, for meters: 0 to 100. */
export function rateLimitPercent(window: IntegrationRateLimitWindow) {
  return window.limit > 0
    ? Math.min(100, Math.round((window.used / window.limit) * 100))
    : 0
}
