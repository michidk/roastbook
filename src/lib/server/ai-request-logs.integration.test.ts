import { afterAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { aiRequestLogs } from '@/db/schema'
import {
  loadAiRequestLog,
  scrubAiRequestPayloads,
} from '@/lib/server/ai-request-logs.server'

const integrationDescribe = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip
let logId: number | undefined

integrationDescribe('AI request log payloads', () => {
  afterAll(async () => {
    if (logId === undefined) return
    await db.delete(aiRequestLogs).where(eq(aiRequestLogs.id, logId))
  })

  test('scrubs stored payloads once storing them is off', async () => {
    const [entry] = await db
      .insert(aiRequestLogs)
      .values({
        requestType: `payload-test-${crypto.randomUUID()}`,
        model: 'test-model',
        requestPayload: { prompt: 'private brew notes' },
        responsePayload: { content: 'private provider output' },
        errorMessage: 'private provider error',
      })
      .returning({ id: aiRequestLogs.id })
    logId = entry?.id
    if (logId === undefined) throw new Error('AI request log was not created')

    expect(
      await scrubAiRequestPayloads({ policy: { storePayloads: true } }),
    ).toBe(0)
    await scrubAiRequestPayloads({ policy: { storePayloads: false } })

    const scrubbed = await loadAiRequestLog(logId)
    expect(scrubbed.requestPayload).toEqual({ redacted: true })
    expect(scrubbed.responsePayload).toBeNull()
    expect(scrubbed.errorMessage).toBeNull()
  })
})
