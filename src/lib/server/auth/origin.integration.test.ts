import { beforeAll, describe, expect, test } from 'bun:test'
import { handleJournalRequest } from './request.server'

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip
suite('shared journal writes behind a reverse proxy', () => {
  beforeAll(() => {
    process.env.AUTH_ENABLED = 'false'
    process.env.PUBLIC_URL = 'https://coffee.example.test'
  })
  test('accepts the public origin and rejects foreign or cross-site writes', async () => {
    for (const [origin, fetchSite, status] of [
      ['https://coffee.example.test', '', 200],
      ['https://coffee.example.test', 'same-origin', 200],
      ['https://evil.test', '', 403],
      ['null', '', 403],
      ['http://app:3000', '', 403],
      ['https://coffee.example.test', 'cross-site', 403],
    ] as const) {
      let reached = false
      const response = await handleJournalRequest(
        new Request('http://app:3000/_serverFn/save', {
          method: 'POST',
          headers: {
            Origin: origin,
            ...(fetchSite ? { 'Sec-Fetch-Site': fetchSite } : {}),
          },
        }),
        async () => {
          reached = true
          return new Response('saved')
        },
      )
      expect(response.status).toBe(status)
      expect(reached).toBe(status === 200)
      await response.text()
    }
  })
})
