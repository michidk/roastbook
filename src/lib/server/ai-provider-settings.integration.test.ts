import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq, inArray, sql } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { aiProviderCredentials, authUsers } from '@/db/schema'
import { DEFAULT_AI_PROVIDER } from '@/lib/ai-provider'
import { loadAdminAiReport } from './admin-ai.server'
import { loadAiAllowance, selectAiProvider } from './ai-allowance.server'
import {
  loadAiProviderSettings,
  removeAiProviderSettings,
  saveAiProviderSettings,
} from './ai-provider-settings.server'
import {
  getOpenAIConfig,
  isRecommendationsEnabled,
  isResearchEnabled,
  isVisionEnabled,
} from './ai-runtime.server'
import { changeUserAiLimit, getAccountState } from './auth/account.server'

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip
const first: JournalIdentity = {
  id: `provider-${randomUUID()}`,

  email: `${randomUUID()}@example.test`,
  role: 'user',
  authentication: true,
  authenticatedAt: new Date(),
}
const second: JournalIdentity = {
  ...first,
  id: `provider-${randomUUID()}`,
  email: `${randomUUID()}@example.test`,
}
const key = 'fixture-user-provider-key'
const connection = {
  ...DEFAULT_AI_PROVIDER,
  baseURL: 'https://8.8.8.8/v1',
  apiKey: key,
}
const asFirst = <T>(work: () => Promise<T>) => withJournal(first, work)
const asSecond = <T>(work: () => Promise<T>) => withJournal(second, work)

suite('private AI provider settings', () => {
  beforeAll(async () => {
    await getControlDb()
      .insert(authUsers)
      .values(
        [first, second].map((user) => ({
          id: user.id,
          email: user.email,
          emailVerified: true,
          aiProviderMode: 'byo' as const,
          journalInitializedAt: new Date(),
        })),
      )
  })
  afterAll(async () => {
    await getControlDb()
      .delete(authUsers)
      .where(inArray(authUsers.id, [first.id, second.id]))
  })
  test('saves encrypted credentials, returns only metadata, and isolates accounts', async () => {
    expect((await asSecond(getOpenAIConfig)).apiKey).toBeUndefined()
    const metadata = await asFirst(() => saveAiProviderSettings(connection))
    expect(metadata.hasApiKey).toBe(true)
    expect(JSON.stringify(metadata)).not.toContain(key)
    expect(metadata).not.toHaveProperty('encryptedApiKey')
    const [stored] = await getControlDb()
      .select()
      .from(aiProviderCredentials)
      .where(eq(aiProviderCredentials.userId, first.id))
    expect(stored?.encryptedApiKey).not.toContain(key)
    expect((await asFirst(getOpenAIConfig)).apiKey).toBe(key)
    expect(await asFirst(isVisionEnabled)).toBe(true)
    expect(await asFirst(isResearchEnabled)).toBe(true)
    expect((await asSecond(loadAiProviderSettings)).hasApiKey).toBe(false)
    expect((await asSecond(getOpenAIConfig)).apiKey).toBeUndefined()
    expect(await asSecond(isVisionEnabled)).toBe(false)
    await expect(
      asFirst(() =>
        getControlDb().transaction(async (tx) => {
          await tx.execute(sql`set local role roastbook_journal`)
          return tx.select().from(aiProviderCredentials)
        }),
      ),
    ).rejects.toThrow()
  })
  test('requires fresh authentication and an explicit key when moving to another endpoint', async () => {
    const stale = { ...first, authenticatedAt: new Date(Date.now() - 700_000) }
    await expect(
      withJournal(stale, () => saveAiProviderSettings(connection)),
    ).rejects.toThrow('Sign in again')
    await expect(
      asFirst(() =>
        saveAiProviderSettings({
          ...connection,
          baseURL: 'https://1.1.1.1/v1',
          apiKey: undefined,
        }),
      ),
    ).rejects.toThrow('Enter your API key')
    await expect(
      asFirst(() =>
        saveAiProviderSettings({
          ...connection,
          baseURL: 'https://127.0.0.1/v1',
        }),
      ),
    ).rejects.toThrow('not allowed')
    const updated = await asFirst(() =>
      saveAiProviderSettings({
        ...connection,
        apiKey: undefined,
        researchModel: 'custom-provider/reasoner',
        api: 'chat-completions',
      }),
    )
    expect(updated.researchModel).toBe('custom-provider/reasoner')
    expect((await asFirst(getOpenAIConfig)).apiKey).toBe(key)
    expect(await asFirst(isRecommendationsEnabled)).toBe(true)
    expect(await asFirst(isResearchEnabled)).toBe(false)
  })
  test('does not let another user remove credentials, supports disconnect, and cascades account deletion', async () => {
    await asSecond(removeAiProviderSettings)
    expect((await asFirst(loadAiProviderSettings)).hasApiKey).toBe(true)
    await asFirst(removeAiProviderSettings)
    expect((await asFirst(getOpenAIConfig)).apiKey).toBeUndefined()
    expect(await asFirst(isRecommendationsEnabled)).toBe(false)
    await asFirst(() => saveAiProviderSettings(connection))
    await getControlDb().delete(authUsers).where(eq(authUsers.id, first.id))
    expect(
      await getControlDb()
        .select()
        .from(aiProviderCredentials)
        .where(eq(aiProviderCredentials.userId, first.id)),
    ).toHaveLength(0)
  })
  test.skipIf(
    process.env.AUTH_ENABLED === 'true' &&
      !!(process.env.AI_PROVIDED_API_KEY || process.env.OPENAI_API_KEY),
  )(
    'keeps the free tier disabled after a user saves their own key',
    async () => {
      await asSecond(() => saveAiProviderSettings(connection))
      await getControlDb()
        .update(authUsers)
        .set({ aiProviderMode: 'provided' })
        .where(eq(authUsers.id, second.id))
      expect(await asSecond(loadAiAllowance)).toMatchObject({
        mode: 'byo',
        providedAvailable: false,
      })
      expect(await asSecond(getOpenAIConfig)).toMatchObject({
        providerMode: 'byo',
        apiKey: key,
      })
      expect((await asSecond(getAccountState)).providedAiAvailable).toBe(false)
      await expect(
        asSecond(() => selectAiProvider('provided')),
      ).rejects.toThrow('Provided AI is unavailable')
      const admin = { ...second, role: 'admin' as const }
      await expect(
        withJournal(admin, () => changeUserAiLimit(second.id, 20)),
      ).rejects.toThrow('Provided AI is unavailable')
      await expect(
        withJournal(admin, () =>
          loadAdminAiReport({ includeByo: true, days: 7 }),
        ),
      ).rejects.toThrow('Provided AI is unavailable')
    },
  )
})
