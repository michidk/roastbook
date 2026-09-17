import { afterAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { aiRequestLogs } from '@/db/schema'
import {
  loadAiRequestLog,
  scrubExpiredAiRequestPayloads,
} from '@/lib/server/ai-request-logs.server'

const integrationDescribe = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip
let logId: number | undefined

integrationDescribe('AI request log retention', () => {
  afterAll(async () => {
    if (logId === undefined) return
    await db.delete(aiRequestLogs).where(eq(aiRequestLogs.id, logId))
  })

  test('scrubs sensitive fields after the detailed-payload retention period', async () => {
    const [entry] = await db
      .insert(aiRequestLogs)
      .values({
        requestType: `retention-test-${crypto.randomUUID()}`,
        model: 'test-model',
        requestPayload: { prompt: 'private brew notes' },
        responsePayload: { content: 'private provider output' },
        errorMessage: 'private provider error',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      })
      .returning({ id: aiRequestLogs.id })
    logId = entry?.id
    if (logId === undefined) throw new Error('AI request log was not created')

    await scrubExpiredAiRequestPayloads({
      policy: {
        storePayloads: true,
        retentionDays: 1,
        maxPayloadBytes: 65_536,
      },
      now: new Date('2026-01-03T00:00:00Z'),
    })

    const scrubbed = await loadAiRequestLog(logId)
    expect(scrubbed.requestPayload).toEqual({ redacted: true })
    expect(scrubbed.responsePayload).toBeNull()
    expect(scrubbed.errorMessage).toBeNull()
  })
})
