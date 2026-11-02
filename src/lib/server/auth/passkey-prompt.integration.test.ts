import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { authPasskeys, authUsers } from '@/db/schema'
import {
  dismissPasskeySetup,
  loadPasskeySetupOffer,
  shouldOfferPasskeySetup,
} from './passkey-prompt.server'

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip
const first: JournalIdentity = {
  id: `passkey-prompt-${randomUUID()}`,
  email: `${randomUUID()}@example.test`,
  role: 'user',
  authentication: true,
  authenticatedAt: new Date(),
}
const second = {
  ...first,
  id: `passkey-prompt-${randomUUID()}`,
  email: `${randomUUID()}@example.test`,
}
const ids = [first.id, second.id]

suite('passkey setup offer', () => {
  beforeAll(async () => {
    await getControlDb()
      .insert(authUsers)
      .values(
        [first, second].map(({ id, email }) => ({
          id,
          email,
          emailVerified: true,
        })),
      )
  })
  beforeEach(async () => {
    await getControlDb()
      .update(authUsers)
      .set({ passkeyPromptDismissedAt: null })
      .where(inArray(authUsers.id, ids))
    await getControlDb()
      .delete(authPasskeys)
      .where(inArray(authPasskeys.userId, ids))
  })
  afterAll(async () => {
    await getControlDb().delete(authUsers).where(inArray(authUsers.id, ids))
  })

  test('offers setup to an account without a passkey', async () => {
    expect(await withJournal(first, shouldOfferPasskeySetup)).toBe(true)
  })
  test('persists No thanks for just the current account', async () => {
    await withJournal(first, dismissPasskeySetup)
    expect(await withJournal(first, shouldOfferPasskeySetup)).toBe(false)
    expect(await withJournal(second, shouldOfferPasskeySetup)).toBe(true)
    const [row] = await getControlDb()
      .select({ dismissedAt: authUsers.passkeyPromptDismissedAt })
      .from(authUsers)
      .where(eq(authUsers.id, first.id))
    expect(row?.dismissedAt).toBeInstanceOf(Date)
    expect(await withJournal(first, loadPasskeySetupOffer)).toEqual({
      ownerId: first.id,
      offer: false,
    })
    expect(await withJournal(second, loadPasskeySetupOffer)).toEqual({
      ownerId: second.id,
      offer: true,
    })
  })
  test('skips accounts with a passkey and offers setup again after its removal', async () => {
    await getControlDb().insert(authPasskeys).values({
      id: randomUUID(),
      userId: first.id,
      credentialID: randomUUID(),
      publicKey: 'presence-test',
      counter: 0,
      deviceType: 'singleDevice',
      backedUp: false,
    })
    expect(await withJournal(first, shouldOfferPasskeySetup)).toBe(false)
    expect(await withJournal(second, shouldOfferPasskeySetup)).toBe(true)
    await getControlDb()
      .delete(authPasskeys)
      .where(eq(authPasskeys.userId, first.id))
    expect(await withJournal(first, shouldOfferPasskeySetup)).toBe(true)
  })
  test('does not offer setup in a shared journal', async () => {
    const shared = { ...first, authentication: false, authenticatedAt: null }
    expect(await withJournal(shared, shouldOfferPasskeySetup)).toBe(false)
    await expect(withJournal(shared, dismissPasskeySetup)).rejects.toThrow(
      'Account management is disabled',
    )
  })
  test('requires a journal identity', async () => {
    await expect(shouldOfferPasskeySetup()).rejects.toThrow(
      'A journal identity is required',
    )
    await expect(dismissPasskeySetup()).rejects.toThrow(
      'A journal identity is required',
    )
  })
})
