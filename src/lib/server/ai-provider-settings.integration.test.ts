import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq, inArray, sql } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { aiProviderCredentials, authUsers } from '@/db/schema'
import { DEFAULT_AI_PROVIDER } from '@/lib/ai-provider'
import {
  loadAiProviderSettings,
  removeAiProviderSettings,
  saveAiProviderSettings,
} from './ai-provider-settings.server'
import {
  getAiProviderConfig,
  isRecommendationsEnabled,
  isResearchEnabled,
  isVisionEnabled,
} from './ai-runtime.server'
import { confirmAs } from './auth/reauthentication-fixture.server'

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
  visionModel: 'fixture-vision',
  researchModel: 'fixture-research',
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
    expect((await asSecond(getAiProviderConfig)).apiKey).toBeUndefined()
    const token = await confirmAs(first, 'save-ai-credentials')
    const metadata = await asFirst(() =>
      saveAiProviderSettings(connection, token),
    )
    expect(metadata.hasApiKey).toBe(true)
    expect(JSON.stringify(metadata)).not.toContain(key)
    expect(metadata).not.toHaveProperty('encryptedApiKey')
    const [stored] = await getControlDb()
      .select()
      .from(aiProviderCredentials)
      .where(eq(aiProviderCredentials.userId, first.id))
    expect(stored?.encryptedApiKey).not.toContain(key)
    expect((await asFirst(getAiProviderConfig)).apiKey).toBe(key)
    expect(await asFirst(isVisionEnabled)).toBe(true)
    expect(await asFirst(isResearchEnabled)).toBe(true)
    expect((await asSecond(loadAiProviderSettings)).hasApiKey).toBe(false)
    expect((await asSecond(getAiProviderConfig)).apiKey).toBeUndefined()
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
  test('requires a confirmation and an explicit key when moving to another endpoint', async () => {
    await expect(
      asFirst(() => saveAiProviderSettings(connection)),
    ).rejects.toThrow('Confirm it’s you')
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
    const confirmation = await confirmAs(first, 'save-ai-credentials')
    const updated = await asFirst(() =>
      saveAiProviderSettings(
        {
          ...connection,
          apiKey: undefined,
          researchModel: 'custom-provider/reasoner',
          api: 'chat-completions',
        },
        confirmation,
      ),
    )
    expect(updated.researchModel).toBe('custom-provider/reasoner')
    expect((await asFirst(getAiProviderConfig)).apiKey).toBe(key)
    expect(await asFirst(isRecommendationsEnabled)).toBe(true)
    expect(await asFirst(isResearchEnabled)).toBe(false)
  })
  test('does not let another user remove credentials, supports disconnect, and cascades account deletion', async () => {
    await asSecond(removeAiProviderSettings)
    expect((await asFirst(loadAiProviderSettings)).hasApiKey).toBe(true)
    await asFirst(removeAiProviderSettings)
    expect((await asFirst(getAiProviderConfig)).apiKey).toBeUndefined()
    expect(await asFirst(isRecommendationsEnabled)).toBe(false)
    const confirmation = await confirmAs(first, 'save-ai-credentials')
    await asFirst(() => saveAiProviderSettings(connection, confirmation))
    await getControlDb().delete(authUsers).where(eq(authUsers.id, first.id))
    expect(
      await getControlDb()
        .select()
        .from(aiProviderCredentials)
        .where(eq(aiProviderCredentials.userId, first.id)),
    ).toHaveLength(0)
  })
})
