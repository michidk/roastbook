import '@tanstack/react-start/server-only'
import {
  getCookie,
  getRequest,
  setCookie,
  setResponseHeader,
} from '@tanstack/react-start/server'
import { requireIdentity } from '@/db/journal-context.server'
import { isReplayingJournal } from '@/db/journal-replay.server'
import { DEMO_MODE } from '@/lib/build-mode'
import { getServerEnv, type ServerEnv } from '@/lib/env.server'
import {
  parseUsageConsent,
  USAGE_CONSENT_COOKIE,
  usageEventSchema,
} from '@/modules/usage-statistics/contract'

// Public ingestion configuration, deliberately distributed with the application.
const projectToken = 'phc_pfUW8sFdRJVqHQHcFyYDP3hhJBspGfXgr5C5QkrvLqVu'
const endpoint = 'https://eu.i.posthog.com/i/v0/e/'
let inFlight = 0

function usageStatisticsAvailable(
  env: Pick<ServerEnv, 'USAGE_STATISTICS_DISABLED' | 'DEPLOYMENT_MODE'>,
) {
  return (
    !DEMO_MODE &&
    !env.USAGE_STATISTICS_DISABLED &&
    env.DEPLOYMENT_MODE === 'self-hosted'
  )
}

export function loadUsagePreference() {
  setResponseHeader('Cache-Control', 'no-store')
  return {
    available: usageStatisticsAvailable(getServerEnv()),
    blocked: getRequest().headers.get('dnt') === '1',
    preference: parseUsageConsent(getCookie(USAGE_CONSENT_COOKIE)).preference,
  }
}

export function saveUsagePreference(granted: boolean) {
  const state = loadUsagePreference()
  const allowed = granted && state.available && !state.blocked
  const previous = parseUsageConsent(getCookie(USAGE_CONSENT_COOKIE))
  setCookie(
    USAGE_CONSENT_COOKIE,
    allowed ? (previous.id ?? crypto.randomUUID()) : 'denied',
    {
      httpOnly: true,
      secure: new URL(getRequest().url).protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    },
  )
}

function usagePayload(
  event: unknown,
  cookie: string | undefined,
  release: string | undefined,
) {
  const parsed = usageEventSchema.safeParse(event)
  const consent = parseUsageConsent(cookie)
  if (!parsed.success || !consent.id) return null
  return {
    api_key: projectToken,
    event: parsed.data,
    distinct_id: `self_hosted:${consent.id}`,
    properties: {
      deployment_type: 'self_hosted',
      release: release ?? 'unknown',
      $process_person_profile: false,
      $geoip_disable: true,
    },
  }
}

/** Best effort, without a queue: unavailable telemetry never delays journal work. */
export async function recordUsageEvent(event: unknown) {
  try {
    const identity = requireIdentity()
    if (
      identity.integration ||
      isReplayingJournal() ||
      !usageStatisticsAvailable(getServerEnv())
    )
      return
    if (getRequest().headers.get('dnt') === '1' || inFlight >= 10) return
    const payload = usagePayload(
      event,
      getCookie(USAGE_CONSENT_COOKIE),
      getServerEnv().ROASTBOOK_SOURCE_REVISION,
    )
    if (!payload) return
    inFlight += 1
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'error',
        signal: AbortSignal.timeout(3_000),
      })
      await response.body?.cancel()
    } finally {
      inFlight -= 1
    }
  } catch {
    // Optional statistics must never expose request data or interrupt a write.
  }
}
