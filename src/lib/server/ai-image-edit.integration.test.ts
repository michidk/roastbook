import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import { getControlDb } from '@/db/connection.server'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { aiProviderCredentials, aiRequestLogs, authUsers } from '@/db/schema'
import { encryptAiKey } from './ai-credential.server'
import { beautifyImageBytes } from './ai-image-edit.server'
import { loadAiRequestLogs } from './ai-request-logs.server'

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip
const identity: JournalIdentity = {
  id: randomUUID(),
  email: `${randomUUID()}@example.test`,
  role: 'user',
  authentication: true,
  authenticatedAt: new Date(),
}
const usage = {
  input_tokens: 1100,
  output_tokens: 500,
  total_tokens: 1600,
  input_tokens_details: { text_tokens: 100, image_tokens: 1000 },
}
suite('image provider usage accounting', () => {
  let server: ReturnType<typeof Bun.serve> | undefined
  let image = Buffer.alloc(0)
  let valid = false
  beforeAll(async () => {
    image = await sharp({
      create: { width: 16, height: 16, channels: 3, background: '#bb9977' },
    })
      .webp()
      .toBuffer()
    server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      async fetch(request) {
        expect(new URL(request.url).pathname).toBe('/v1/images/edits')
        const form = await request.formData()
        expect(form.get('model')).toBe('gpt-image-1.5')
        return Response.json({
          usage,
          data: valid ? [{ b64_json: image.toString('base64') }] : [],
        })
      },
    })
    const origin = `http://127.0.0.1:${server.port}`
    process.env.AI_ALLOWED_PRIVATE_ORIGINS = origin
    process.env.AI_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 31).toString(
      'base64',
    )
    process.env.AI_TELEMETRY_STORE_PAYLOADS = 'false'
    const database = getControlDb()
    await database.insert(authUsers).values({
      id: identity.id,
      email: identity.email,
      emailVerified: true,
      journalInitializedAt: new Date(),
    })
    await database.insert(aiProviderCredentials).values({
      userId: identity.id,
      baseURL: `${origin}/v1`,
      api: 'responses',
      visionModel: 'fixture-vision',
      researchModel: 'fixture-research',
      encryptedApiKey: encryptAiKey(
        'fixture-provider-key',
        identity.id,
        `${origin}/v1`,
      ),
    })
  })
  afterAll(async () => {
    await getControlDb()
      .delete(aiRequestLogs)
      .where(eq(aiRequestLogs.ownerId, identity.id))
    await getControlDb().delete(authUsers).where(eq(authUsers.id, identity.id))
    server?.stop(true)
  })
  test('preserves billable usage after invalid output and journal rollback', async () => {
    await expect(
      withJournal(identity, () => beautifyImageBytes(image, 'image/webp')),
    ).rejects.toThrow('original is safe')
    const logs = await withJournal(identity, () =>
      loadAiRequestLogs({ limit: 20 }),
    )
    expect(logs.items).toHaveLength(1)
    expect(logs.items[0]).toMatchObject({
      status: 'failed',
      promptTokens: 1100,
      completionTokens: 500,
      totalTokens: 1600,
      imageAccounting: { usage, totalCost: null },
    })
  })
  test('records successful edits without storing image or prompt payloads', async () => {
    valid = true
    const result = await withJournal(identity, () =>
      beautifyImageBytes(image, 'image/webp'),
    )
    expect(Buffer.from(result.binaryData)).toEqual(image)
    const [log] = await getControlDb()
      .select()
      .from(aiRequestLogs)
      .where(eq(aiRequestLogs.ownerId, identity.id))
      .orderBy(aiRequestLogs.id)
    expect(log?.requestPayload).toEqual({ redacted: true })
    const logs = await withJournal(identity, () =>
      loadAiRequestLogs({ limit: 20 }),
    )
    expect(logs.items[0]).toMatchObject({
      status: 'succeeded',
      imageAccounting: { usage, totalCost: null },
    })
  })
})
