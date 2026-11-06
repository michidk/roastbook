import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'

assert(process.env.TEST_DATABASE_URL, 'An isolated test database is required')
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.AUTH_ENABLED = 'true'
process.env.DEPLOYMENT_MODE = 'self-hosted'
process.env.PUBLIC_URL = 'https://coffee.example.test'
process.env.AUTH_ADMIN_EMAIL = 'owner@example.test'
process.env.AUTH_SECRET = 'r'.repeat(64)
process.env.EMAIL_FROM = 'fixture@example.test'
process.env.SMTP_URL = 'smtp://127.0.0.1:1'
process.env.AI_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
  'base64',
)
let fail = false
const output = 'PRIVATE_OUTPUT_FIXTURE'
const provider = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const body = await request.json()
    assert.equal(body.store, false)
    if (new URL(request.url).pathname.endsWith('/chat/completions') && !fail) {
      return new Response(
        `data: ${JSON.stringify({
          id: 'chat_fixture',
          object: 'chat.completion.chunk',
          created: 0,
          model: 'fixture-vision',
          choices: [
            {
              index: 0,
              delta: {
                role: 'assistant',
                content: JSON.stringify({ name: output }),
              },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
        })}\n\ndata: [DONE]\n\n`,
        { headers: { 'content-type': 'text/event-stream' } },
      )
    }
    if (fail)
      return Response.json(
        { error: 'PRIVATE_PROVIDER_ERROR_FIXTURE' },
        { status: 503 },
      )
    return new Response(
      `data: ${JSON.stringify({
        type: 'response.completed',
        sequence_number: 0,
        response: {
          id: 'resp_fixture',
          object: 'response',
          created_at: 0,
          status: 'completed',
          model: 'fixture-research',
          output: [
            {
              id: 'msg_fixture',
              type: 'message',
              role: 'assistant',
              status: 'completed',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({ name: output }),
                  annotations: [],
                },
              ],
            },
          ],
          usage: { input_tokens: 20, output_tokens: 10, total_tokens: 30 },
        },
      })}\n\n`,
      { headers: { 'content-type': 'text/event-stream' } },
    )
  },
})
process.env.AI_ALLOWED_PRIVATE_ORIGINS = `http://127.0.0.1:${provider.port}`
const { getControlDb } = await import('../src/db/connection.server')
const { withJournal } = await import('../src/db/journal-context.server')
const { authUsers } = await import('../src/db/schema')
const { saveAiProviderSettings } = await import(
  '../src/lib/server/ai-provider-settings.server'
)
const { confirmAs } = await import(
  '../src/lib/server/auth/reauthentication-fixture.server'
)
const { researchBeanFromWeb } = await import(
  '../src/lib/server/ai-web-research.server'
)
const { extractBeanInfoFromImages } = await import(
  '../src/lib/server/ai-image-extraction.server'
)
const { prepareAiImages } = await import('../src/lib/server/ai-images.server')
const { loadAiRequestLogs, loadAiRequestLog } = await import(
  '../src/lib/server/ai-request-logs.server'
)
const user = {
  id: `privacy-${randomUUID()}`,
  email: `${randomUUID()}@example.test`,
  role: 'user' as const,
  authentication: true,
  authenticatedAt: new Date(),
}
const logs: string[] = []
const originalInfo = console.info
const originalError = console.error
try {
  await getControlDb().insert(authUsers).values({
    id: user.id,
    email: user.email,
    emailVerified: true,
    journalInitializedAt: new Date(),
  })
  console.info = (...args) => {
    logs.push(JSON.stringify(args))
  }
  console.error = (...args) => {
    logs.push(JSON.stringify(args))
  }
  const confirmation = await confirmAs(user, 'save-ai-credentials')
  await withJournal(user, () =>
    saveAiProviderSettings(
      {
        baseURL: `http://127.0.0.1:${provider.port}/v1`,
        apiKey: 'fixture-user-key',
        api: 'responses',
        visionModel: 'fixture-vision',
        researchModel: 'fixture-research',
      },
      confirmation,
    ),
  )
  const result = await withJournal(user, () =>
    researchBeanFromWeb('PRIVATE_INPUT_FIXTURE', 'PRIVATE_ROASTER_FIXTURE'),
  )
  assert.equal(result.name, output)
  fail = true
  await assert.rejects(() =>
    withJournal(user, () =>
      researchBeanFromWeb('PRIVATE_FAILURE_INPUT_FIXTURE'),
    ),
  )
  fail = false
  const image = await sharp({
    create: { width: 12, height: 12, channels: 3, background: '#c7352c' },
  })
    .png()
    .toBuffer()
  const images = await prepareAiImages([
    { imageBase64: image.toString('base64'), mimeType: 'image/png' },
  ])
  for (const api of ['responses', 'chat-completions'] as const) {
    const token = await confirmAs(user, 'save-ai-credentials')
    await withJournal(user, () =>
      saveAiProviderSettings(
        {
          baseURL: `http://127.0.0.1:${provider.port}/v1`,
          api,
          visionModel: 'fixture-vision',
          researchModel: 'fixture-research',
        },
        token,
      ),
    )
    const extracted = await withJournal(user, () =>
      extractBeanInfoFromImages(images),
    )
    assert.equal(extracted.name, output)
    const page = await withJournal(user, () => loadAiRequestLogs({ limit: 10 }))
    const summary = page.items.find(
      (entry) => entry.requestType === 'bean-image-extraction',
    )
    assert(summary)
    assert.equal(summary.status, 'succeeded')
    assert.equal(summary.totalTokens, 30)
    const entry = await withJournal(user, () => loadAiRequestLog(summary.id))
    assert(
      !JSON.stringify(entry).includes(image.toString('base64')),
      'Image bytes must never be stored in telemetry',
    )
    assert(!JSON.stringify(entry).includes('fixture-user-key'))
  }
  assert(logs.length > 0, 'Operational metadata should still be logged')
  assert(
    !logs.join('\n').includes('PRIVATE_'),
    'Private research content must not enter application logs',
  )
  assert(
    !logs.join('\n').includes('fixture-user-key'),
    'Provider credentials must not enter application logs',
  )
} finally {
  console.info = originalInfo
  console.error = originalError
  await getControlDb().delete(authUsers).where(eq(authUsers.id, user.id))
  provider.stop(true)
}
console.info(
  'AI research privacy checks passed for successful and failed requests',
)
process.exit(0)
