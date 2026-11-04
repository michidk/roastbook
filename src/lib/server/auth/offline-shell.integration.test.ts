import { beforeAll, describe, expect, test } from 'bun:test'
import { handleJournalRequest } from './request.server'

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip
suite('public offline shell and private request boundaries', () => {
  beforeAll(() => {
    process.env.AUTH_ENABLED = 'true'
    process.env.AUTH_URL = 'https://coffee.example'
    process.env.AUTH_SECRET =
      'isolated-shell-test-secret-at-least-thirty-two-characters'
    process.env.EMAIL_FROM = 'coffee@example.test'
    process.env.SMTP_URL = 'smtp://localhost:1025'
  })
  test('only the exact public offline shell GET bypasses the journal identity boundary', async () => {
    const headers = { 'X-Roastbook-Owner': 'another-account' }
    const response = await handleJournalRequest(
      new Request('https://coffee.example/offline-shell', { headers }),
      async () => new Response('public shell'),
    )
    expect(await response.text()).toBe('public shell')
    expect(response.headers.has('X-Roastbook-Owner')).toBe(false)
    for (const [path, method] of [
      ['/offline-shell', 'POST'],
      ['/offline-shell', 'HEAD'],
      ['/offline-shell/private', 'GET'],
      ['/api/journal', 'GET'],
    ]) {
      const denied = await handleJournalRequest(
        new Request(`https://coffee.example${path}`, { method, headers }),
        async () => {
          throw new Error('Private request unexpectedly reached its handler')
        },
      )
      expect(denied.status).toBe(401)
    }
  })
})
