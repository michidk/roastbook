import { describe, expect, test } from 'bun:test'
import { renderAccountEmail } from './account-email'

const url = 'https://journal.example.test/login#sign-in=opaque-token'

describe('account email templates', () => {
  test('keeps the code in the message body and provides HTML and plain text', async () => {
    const email = await renderAccountEmail({
      kind: 'sign-in',
      url,
      code: '012345',
    })
    expect(email.subject).not.toContain('012345')
    expect(email.html).toContain('lang="en"')
    expect(email.html).toContain('012345')
    expect(email.html).toContain(`href="${url}"`)
    expect(email.text).toContain('Your sign-in code is 012345.')
    expect(email.text).toContain(url)
    expect(email.text).toContain('10 minutes')
    expect(email.html).not.toMatch(/<img|<script|@import|<link\s/i)
    const preheader = /aria-hidden="true">(.*?)<\/div>/.exec(email.html)?.[1]
    expect(preheader).toBeDefined()
    expect(preheader).not.toContain('012345')
  })

  test('escapes dynamic HTML and links without changing plain-text content', async () => {
    const newEmail = '<img src=x onerror=alert(1)>@example.test'
    const email = await renderAccountEmail({
      kind: 'change-email',
      url: 'https://journal.example.test/verify?token=opaque&continue=%22',
      newEmail,
    })
    expect(email.html).not.toContain('<img')
    expect(email.html).toContain('&lt;img')
    expect(email.html).toContain('token=opaque&amp;continue=')
    expect(email.text).toContain(newEmail)
  })

  test('uses distinct verification and deletion actions with safe deletion copy', async () => {
    const verification = await renderAccountEmail({ kind: 'verify-email', url })
    expect(verification.text).toContain('Verify email address')
    const deletion = await renderAccountEmail({ kind: 'delete-account', url })
    expect(deletion.text).toContain('Review account deletion')
    expect(deletion.text).toContain(
      'Opening this email or link does not delete anything.',
    )
    expect(deletion.text).toContain('cannot be undone')
  })

  test.each(['javascript:alert(1)', 'https://user:password@example.test'])(
    'rejects unsafe action links',
    async (unsafeUrl) => {
      await expect(
        renderAccountEmail({ kind: 'verify-email', url: unsafeUrl }),
      ).rejects.toThrow('Invalid account email link')
    },
  )
})
