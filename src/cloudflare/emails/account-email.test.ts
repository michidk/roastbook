import { describe, expect, test } from 'bun:test'
import { renderAccountEmail } from './account-email'

const url = 'https://app.roastbook.coffee/settings/account'
const kinds = [
  { kind: 'sign-in', url, code: '01234567' },
  { kind: 'change-email', url, newEmail: '<img src=x>@example.test' },
  { kind: 'verify-email', url },
  { kind: 'delete-account', url },
  { kind: 'export-ready', url },
  { kind: 'ai-quota-low', url, used: 8, limit: 10, resetAt: new Date('2026-11-09T00:00:00Z') },
] as const

describe('hosted account emails', () => {
  test.each(kinds)('renders $kind as HTML and plain text', async (content) => {
    const started = performance.now()
    const email = await renderAccountEmail(content)
    console.info(content.kind, `${(performance.now() - started).toFixed(1)}ms`)
    expect(email.subject.length).toBeGreaterThan(0)
    expect(email.html).toContain(`href="${url}"`)
    expect(email.html).toContain('https://roastbook.coffee/privacy')
    expect(email.html).not.toMatch(/<script|<img src=x/i)
    expect(email.text).toContain(url)
  })

  test('keeps the sign-in code in the body, not the subject', async () => {
    const email = await renderAccountEmail(kinds[0])
    expect(email.subject).not.toContain('01234567')
    expect(email.text).toContain('01234567')
  })

  test('rejects unsafe links', async () => {
    await expect(
      renderAccountEmail({ kind: 'verify-email', url: 'javascript:alert(1)' }),
    ).rejects.toThrow('Invalid account email link')
  })
})
