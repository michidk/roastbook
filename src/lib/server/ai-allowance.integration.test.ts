import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { getControlDb } from '@/db/connection.server'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import {
  aiRequestLogs,
  aiWeeklyUsage,
  authUsers,
  beans,
  brewingMethods,
  cafeVisits,
  shots,
} from '@/db/schema'
import { aiAllowanceWeek } from '@/lib/ai-allowance'
import { loadAdminAiReport } from './admin-ai.server'
import { loadAiAllowance, selectAiProvider } from './ai-allowance.server'
import { extractBeanInfoFromImages } from './ai-image-extraction.server'
import { saveAiProviderSettings } from './ai-provider-settings.server'
import {
  completeAiRequestLog,
  failAiRequestLog,
  loadAiRequestLog,
  loadAiRequestLogs,
  loadAiRequestStats,
  startAiRequestLog,
} from './ai-request-logs.server'
import { getOpenAIConfig } from './ai-runtime.server'
import {
  changeUserAiLimit,
  getAccountState,
  listUsers,
} from './auth/account.server'

const upstreamRequests: {
  model: string
  limit: number
  authorization: string | null
}[] = []
const operatorKey = 'integration-operator-ai-key'
const operatorVisionModel = 'gpt-4o-mini'
const provider = process.env.TEST_DATABASE_URL
  ? Bun.serve({
      port: 0,
      async fetch(request) {
        const body = await request.json()
        upstreamRequests.push({
          model: body.model,
          limit: body.max_completion_tokens,
          authorization: request.headers.get('authorization'),
        })
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({ name: 'Fixture coffee' }),
              },
            },
          ],
          usage: {
            prompt_tokens: 12,
            completion_tokens: 8,
            total_tokens: 20,
          },
        })
      },
    })
  : undefined
if (provider) {
  process.env.AUTH_ENABLED = 'true'
  process.env.AUTH_SECRET = Buffer.alloc(32, 47).toString('hex')
  process.env.EMAIL_PROVIDER = 'smtp'
  process.env.EMAIL_FROM = 'test@example.test'
  process.env.SMTP_URL = 'smtp://127.0.0.1:1'
  process.env.AI_PROVIDED_API_KEY = operatorKey
  process.env.AI_PROVIDED_API = 'chat-completions'
  process.env.AI_PROVIDED_BASE_URL = `http://127.0.0.1:${provider.port}/v1`
  process.env.AI_PROVIDED_VISION_MODEL = operatorVisionModel
  process.env.AI_PROVIDED_RESEARCH_MODEL = operatorVisionModel
  process.env.AI_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 31).toString(
    'base64',
  )
  process.env.DEPLOYMENT_MODE = 'hosted'
  process.env.AUTH_URL = 'https://coffee.example.test'
  process.env.AUTH_ADMIN_EMAIL = 'owner@example.test'
  delete process.env.AI_ALLOWED_PRIVATE_ORIGINS
}
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip
const user: JournalIdentity = {
  id: `free-${randomUUID()}`,
  email: `${randomUUID()}@example.test`,
  role: 'user',
  authentication: true,
  authenticatedAt: new Date(),
}
const other: JournalIdentity = {
  ...user,
  id: `free-${randomUUID()}`,
  email: `${randomUUID()}@example.test`,
}
const admin: JournalIdentity = {
  ...user,
  id: `free-${randomUUID()}`,
  email: `${randomUUID()}@example.test`,
  role: 'admin',
}
const ids = [user.id, other.id, admin.id]
const asUser = <T>(work: () => Promise<T>) => withJournal(user, work)
const asAdmin = <T>(work: () => Promise<T>) => withJournal(admin, work)
const start = (providerMode: 'provided' | 'byo' = 'provided') =>
  startAiRequestLog({
    providerMode,
    requestType: 'quota-integration',
    model: 'gpt-4o-mini',
    requestPayload: { private: 'journal text' },
  })

suite('provided AI accounting and administration', () => {
  beforeAll(async () => {
    await getControlDb()
      .insert(authUsers)
      .values(
        [user, other, admin].map((account) => ({
          id: account.id,
          email: account.email,
          role: account.role,
          emailVerified: true,
        })),
      )
  })
  afterAll(async () => {
    await provider?.stop(true)
    await getControlDb()
      .delete(aiRequestLogs)
      .where(inArray(aiRequestLogs.ownerId, ids))
    for (const table of [shots, cafeVisits, beans, brewingMethods])
      await getControlDb().delete(table).where(inArray(table.ownerId, ids))
    await getControlDb().delete(authUsers).where(inArray(authUsers.id, ids))
  })
  test('selects the operator provider explicitly and never exposes its key through settings', async () => {
    const config = await asUser(getOpenAIConfig)
    expect(config.providerMode).toBe('provided')
    expect((await asUser(getAccountState)).providedAiAvailable).toBe(true)
    expect(config.apiKey).toBe(operatorKey)
    expect(JSON.stringify(await asUser(loadAiAllowance))).not.toContain(
      operatorKey,
    )
    await asUser(() => selectAiProvider('byo'))
    expect((await asUser(getOpenAIConfig)).apiKey).toBeUndefined()
    await asUser(() => selectAiProvider('provided'))
    await expect(
      withJournal({ ...user, authentication: false }, () =>
        selectAiProvider('provided'),
      ),
    ).rejects.toThrow('unavailable')
  })
  test('rejects user-supplied credentials for the internal operator endpoint', async () => {
    const config = await asUser(getOpenAIConfig)
    await expect(
      asUser(() =>
        saveAiProviderSettings({ ...config, apiKey: 'fixture-user-key' }),
      ),
    ).rejects.toThrow('HTTPS')
    expect((await asUser(getOpenAIConfig)).providerMode).toBe('provided')
    expect(upstreamRequests).toHaveLength(0)
  })
  test('admits exactly ten concurrent requests and rejects the remainder before dispatch', async () => {
    const results = await asUser(() =>
      Promise.allSettled(Array.from({ length: 20 }, () => start())),
    )
    expect(results.filter((row) => row.status === 'fulfilled')).toHaveLength(10)
    expect(results.filter((row) => row.status === 'rejected')).toHaveLength(10)
    expect((await asUser(loadAiAllowance)).used).toBe(10)
    expect((await withJournal(other, loadAiAllowance)).used).toBe(0)
    const rejected = results.find((result) => result.status === 'rejected')
    expect(
      rejected?.status === 'rejected' ? String(rejected.reason) : '',
    ).toContain('exhausted')
    await expect(asUser(start)).rejects.toThrow('exhausted')
  })
  test('survives a journal rollback, separates personal costs, and isolates logs', async () => {
    await asAdmin(() => changeUserAiLimit(user.id, 12))
    let providedId = 0
    await expect(
      asUser(async () => {
        providedId = await start()
        await completeAiRequestLog({
          logId: providedId,
          model: 'gpt-4o-mini',
          responsePayload: {},
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
            promptTokensDetails: { cachedTokens: 0 },
          },
          durationMs: 1,
        })
        throw new Error('journal rollback')
      }),
    ).rejects.toThrow('journal rollback')
    expect((await asUser(loadAiAllowance)).used).toBe(11)
    expect((await asUser(() => loadAiRequestLog(providedId))).status).toBe(
      'succeeded',
    )
    const byoId = await asUser(() => start('byo'))
    await asUser(() =>
      completeAiRequestLog({
        logId: byoId,
        model: 'gpt-4o-mini',
        responsePayload: {},
        usage: {
          promptTokens: 20,
          completionTokens: 10,
          totalTokens: 30,
          promptTokensDetails: { cachedTokens: 0 },
        },
        durationMs: 1,
      }),
    )
    const personal = await asUser(() => loadAiRequestStats())
    const provided = await asUser(() => loadAiRequestStats('provided'))
    expect(personal.requestCount).toBe(1)
    expect(personal.totalTokens).toBe(30)
    expect(provided.totalTokens).toBe(150)
    expect(Number(personal.estimatedCostUsd)).toBeLessThan(
      Number(provided.estimatedCostUsd),
    )
    expect(
      (await withJournal(other, () => loadAiRequestLogs({ limit: 50 }))).items,
    ).toHaveLength(0)
    await expect(
      withJournal(other, () => loadAiRequestLog(providedId)),
    ).rejects.toThrow('not found')
    await withJournal(other, () =>
      failAiRequestLog({
        logId: providedId,
        model: 'gpt-4o-mini',
        error: 'bad actor',
        durationMs: 1,
      }),
    )
    expect((await asUser(() => loadAiRequestLog(providedId))).status).toBe(
      'succeeded',
    )
  })
  test('supports administrator allowance changes and blocks journal writes to the quota ledger', async () => {
    await expect(asUser(() => changeUserAiLimit(other.id, 99))).rejects.toThrow(
      'Administrator',
    )
    await expect(
      asUser(() => loadAdminAiReport({ includeByo: true, days: 30 })),
    ).rejects.toThrow('Administrator')
    await expect(asUser(() => listUsers(0))).rejects.toThrow('Administrator')
    await expect(
      asUser(() => db.execute(sql`update ai_weekly_usage set requests = 0`)),
    ).rejects.toThrow()
    await asAdmin(() => changeUserAiLimit(user.id, 0))
    await expect(asUser(start)).rejects.toThrow('exhausted')
    await asAdmin(() => changeUserAiLimit(user.id, 13))
    await asUser(start)
    expect((await asUser(loadAiAllowance)).used).toBe(12)
    const stale = { ...admin, authenticatedAt: new Date(0) }
    await expect(
      withJournal(stale, () => changeUserAiLimit(user.id, 90)),
    ).rejects.toThrow('Sign in again')
  })
  test('ignores previous-week reservations and keeps usage independent of diagnostic logs', async () => {
    const week = aiAllowanceWeek()
    await getControlDb()
      .insert(aiWeeklyUsage)
      .values({
        userId: other.id,
        weekStart: new Date(week.start.getTime() - 7 * 86400_000),
        requests: 10,
      })
    expect((await withJournal(other, loadAiAllowance)).used).toBe(0)
    const logId = await withJournal(other, start)
    await withJournal(other, () =>
      failAiRequestLog({
        logId,
        model: 'gpt-4o-mini',
        error: 'provider unavailable',
        durationMs: 1,
      }),
    )
    await getControlDb()
      .delete(aiRequestLogs)
      .where(eq(aiRequestLogs.id, logId))
    expect((await withJournal(other, loadAiAllowance)).used).toBe(1)
  })
  test('dispatches with the operator key, records tokens, and blocks over-quota calls before the network', async () => {
    await asAdmin(() => changeUserAiLimit(other.id, 2))
    await withJournal(other, () =>
      extractBeanInfoFromImages(['aGVsbG8='], 'image/png'),
    )
    expect(upstreamRequests).toHaveLength(1)
    expect(upstreamRequests[0]).toMatchObject({
      model: operatorVisionModel,
      limit: 4096,
      authorization: `Bearer ${operatorKey}`,
    })
    expect(
      (await withJournal(other, () => loadAiRequestStats('provided')))
        .totalTokens,
    ).toBe(20)
    await expect(
      withJournal(other, () =>
        extractBeanInfoFromImages(['aGVsbG8='], 'image/png'),
      ),
    ).rejects.toThrow('exhausted')
    expect(upstreamRequests).toHaveLength(1)
  })
  test('counts each journal entity without multiplying joins and preserves last login', async () => {
    const loggedIn = new Date('2026-11-01T12:34:00Z')
    await getControlDb()
      .update(authUsers)
      .set({ lastLoginAt: loggedIn })
      .where(eq(authUsers.id, user.id))
    await asUser(async () => {
      await db.insert(beans).values([{ name: 'One' }, { name: 'Two' }])
      const [method] = await db
        .insert(brewingMethods)
        .values({ name: 'Fixture method' })
        .returning({ id: brewingMethods.id })
      if (!method) throw new Error('No method')
      await db
        .insert(shots)
        .values([
          { brewingMethodId: method.id },
          { brewingMethodId: method.id },
          { brewingMethodId: method.id },
        ])
      await db.insert(cafeVisits).values({ notes: 'Fixture visit' })
    })
    const listed = await asAdmin(() => listUsers(0))
    expect(
      listed.users.find((account) => account.id === user.id),
    ).toMatchObject({ brews: 3, beans: 2, visits: 1, lastLoginAt: loggedIn })
    expect(
      listed.users.find((account) => account.id === other.id),
    ).toMatchObject({ brews: 0, beans: 0, visits: 0, lastLoginAt: null })
  })
  test('reports provider-only costs by default and includes BYOAI only when requested', async () => {
    const provided = await asAdmin(() =>
      loadAdminAiReport({ includeByo: false, days: 30 }),
    )
    const all = await asAdmin(() =>
      loadAdminAiReport({ includeByo: true, days: 30 }),
    )
    expect(provided.logs.every((log) => log.providerMode === 'provided')).toBe(
      true,
    )
    expect(all.summary.requestCount).toBe(provided.summary.requestCount + 1)
    expect(all.summary.totalTokens).toBe(200)
    expect(all.byProvider).toHaveLength(2)
    expect(all.daily).not.toHaveLength(0)
    expect(
      all.logs.every(
        (log) => !('requestPayload' in log) && !('responsePayload' in log),
      ),
    ).toBe(true)
    const users = await asAdmin(() => listUsers(0))
    expect(users.users.find((account) => account.id === user.id)).toMatchObject(
      {
        aiWeeklyLimit: 13,
        aiRequestsThisWeek: 12,
        brews: 3,
        beans: 2,
        visits: 1,
        lastLoginAt: new Date('2026-11-01T12:34:00Z'),
      },
    )
  })
})
