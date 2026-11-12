import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from 'bun:test'
import {
  createServerEntry,
  getResponseHeaders,
} from '@tanstack/react-start/server'
import * as context from '@/db/journal-context.server'
import { withRecordedValues } from '@/db/journal-replay.server'
import * as environment from '@/lib/env.server'
import {
  parseUsageConsent,
  USAGE_CONSENT_COOKIE,
} from '@/modules/usage-statistics/contract'
import {
  loadUsagePreference,
  recordUsageEvent,
  saveUsagePreference,
} from './usage-statistics.server'

const id = 'b9024b0c-c034-4a4d-b22f-ab76b2719ec7'
const identity = {
  id: 'private-account',
  email: 'private@example.test',
  role: 'user' as const,
  authentication: true,
  authenticatedAt: null,
}
const baseEnvironment = {
  DATABASE_URL: 'postgresql://test:test@localhost/test',
}
let sent: { url: string; body: unknown; headers: Headers }[] = []

function request(work: () => unknown, cookie?: string, dnt?: string) {
  const headers = new Headers()
  if (cookie)
    headers.set('cookie', `${USAGE_CONSENT_COOKIE}=${cookie}; session=private`)
  if (dnt) headers.set('dnt', dnt)
  headers.set('referer', 'https://private-host.example/secret')
  headers.set('x-forwarded-for', '192.0.2.1')
  return createServerEntry({
    fetch: async () => {
      await work()
      return new Response('ok', {
        headers: Array.from(getResponseHeaders().entries()),
      })
    },
  }).fetch(new Request('https://journal.example/action', { headers }))
}

beforeEach(() => {
  sent = []
  spyOn(environment, 'getServerEnv').mockReturnValue(
    environment.parseServerEnv(baseEnvironment),
  )
  spyOn(context, 'requireIdentity').mockReturnValue(identity)
  spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
        sent.push({
          url: String(url),
          body: JSON.parse(String(init?.body)),
          headers: new Headers(init?.headers),
        })
        return new Response('ok')
      },
      { preconnect: globalThis.fetch.preconnect },
    ),
  )
})
afterEach(() => mock.restore())

describe('optional usage statistics', () => {
  test('does not contact PostHog before consent, on denial or for malformed consent', async () => {
    for (const cookie of [
      undefined,
      'denied',
      'granted',
      'email@example.test',
      'not-a-uuid',
    ]) {
      await request(() => recordUsageEvent('brew_created'), cookie)
    }
    expect(sent).toEqual([])
  })

  test('sends only the approved metadata without request headers or account identity', async () => {
    for (const event of [
      'bean_created',
      'brew_created',
      'ai_recommendation_created',
    ]) {
      await request(() => recordUsageEvent(event), id)
    }
    expect(sent).toHaveLength(3)
    expect(sent[0]?.body).toEqual({
      api_key: 'phc_pfUW8sFdRJVqHQHcFyYDP3hhJBspGfXgr5C5QkrvLqVu',
      event: 'bean_created',
      distinct_id: `self_hosted:${id}`,
      properties: {
        deployment_type: 'self_hosted',
        release: 'unknown',
        $process_person_profile: false,
        $geoip_disable: true,
      },
    })
    expect(sent[0]?.url).toBe('https://eu.i.posthog.com/i/v0/e/')
    expect([...(sent[0]?.headers.keys() ?? [])]).toEqual(['content-type'])
    expect(JSON.stringify(sent)).not.toContain('private')
  })

  test('rejects unapproved events and payload objects', async () => {
    for (const event of [
      'ai_key_saved',
      '$pageview',
      '$ai_generation',
      { event: 'brew_created', prompt: 'secret' },
    ]) {
      await request(() => recordUsageEvent(event), id)
    }
    expect(sent).toEqual([])
  })

  test('administrator opt-out and Do Not Track override saved consent', async () => {
    await request(() => recordUsageEvent('brew_created'), id, '1')
    spyOn(environment, 'getServerEnv').mockReturnValue(
      environment.parseServerEnv({
        ...baseEnvironment,
        USAGE_STATISTICS_DISABLED: 'true',
      }),
    )
    await request(() => recordUsageEvent('brew_created'), id)
    expect(sent).toEqual([])
  })

  test('never backfills offline replays or collects integration activity', async () => {
    await request(
      () => withRecordedValues({}, () => recordUsageEvent('brew_created')),
      id,
    )
    spyOn(context, 'requireIdentity').mockReturnValue({
      ...identity,
      integration: { channel: 'api', credentialId: 'private', scopes: [] },
    })
    await request(() => recordUsageEvent('brew_created'), id)
    expect(sent).toEqual([])
  })

  test('consent creates an HttpOnly identity; revocation removes it and re-consent rotates it', async () => {
    const accepted = await request(() => saveUsagePreference(true))
    const cookie = accepted.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    const value = cookie.split(';')[0]?.split('=')[1]
    expect(parseUsageConsent(value).preference).toBe('granted')
    const revoked = await request(() => saveUsagePreference(false), value)
    expect(revoked.headers.get('set-cookie')).toContain(
      `${USAGE_CONSENT_COOKIE}=denied`,
    )
    const acceptedAgain = await request(
      () => saveUsagePreference(true),
      'denied',
    )
    expect(acceptedAgain.headers.get('set-cookie')).not.toContain(
      value ?? 'missing',
    )
    expect(sent).toEqual([])
  })

  test('does not accept opt-in when disabled and exposes the effective preference', async () => {
    spyOn(environment, 'getServerEnv').mockReturnValue(
      environment.parseServerEnv({
        ...baseEnvironment,
        USAGE_STATISTICS_DISABLED: 'true',
      }),
    )
    const response = await request(() => {
      expect(loadUsagePreference()).toMatchObject({
        available: false,
        preference: 'pending',
      })
      saveUsagePreference(true)
    })
    expect(response.headers.get('set-cookie')).toContain(
      `${USAGE_CONSENT_COOKIE}=denied`,
    )
  })

  test('delivery failures and calls outside a request never fail journal work', async () => {
    spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'))
    const response = await request(() => recordUsageEvent('brew_created'), id)
    expect(response.status).toBe(200)
    await expect(recordUsageEvent('brew_created')).resolves.toBeUndefined()
  })
})
