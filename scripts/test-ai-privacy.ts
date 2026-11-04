import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'

assert(process.env.TEST_DATABASE_URL, 'An isolated test database is required')
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.AUTH_ENABLED = 'true'
process.env.DEPLOYMENT_MODE = 'self-hosted'
process.env.AUTH_URL = 'https://coffee.example.test'
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
  fetch() {
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
const { researchBeanFromWeb } = await import(
  '../src/lib/server/ai-web-research.server'
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
  await withJournal(user, () =>
    saveAiProviderSettings({
      baseURL: `http://127.0.0.1:${provider.port}/v1`,
      apiKey: 'fixture-user-key',
      api: 'responses',
      visionModel: 'fixture-vision',
      researchModel: 'fixture-research',
    }),
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
