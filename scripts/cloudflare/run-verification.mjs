import { readdir, readFile } from 'node:fs/promises'
import { convertV4MiniflareOptions, Miniflare } from 'miniflare'

const scriptPath = process.argv[2]
if (!scriptPath) throw new Error('A compiled verification worker is required')
const messages = []
const runtime = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    scriptPath,
    compatibilityDate: '2026-11-02',
    compatibilityFlags: ['nodejs_compat'],
    serviceBindings: {
      ACCOUNT_EMAIL: async (request) => {
        if (new URL(request.url).pathname === '/messages')
          return Response.json(messages)
        messages.push(await request.json())
        return new Response(null, { status: 204 })
      },
    },
    d1Databases: ['DB'],
    r2Buckets: ['MEDIA'],
    bindings: {
      AUTH_ENABLED: 'true',
      AUTH_SIGNUP_ENABLED: 'true',
      DEPLOYMENT_MODE: 'hosted',
      AUTH_URL: 'https://app.example.test',
      AUTH_SECRET: 'local-verification-secret-32-characters',
      AUTH_ADMIN_EMAIL: 'operator@example.test',
      EMAIL_FROM: 'roastbook@example.test',
      AI_PROVIDED_API_KEY: 'local-verification-provider-key',
      AI_PROVIDED_VISION_MODEL: 'gpt-test',
      AI_PROVIDED_RESEARCH_MODEL: 'gpt-test',
    },
  }),
)
try {
  const db = await runtime.getD1Database('DB')
  const files = (await readdir('drizzle-d1'))
    .filter((file) => file.endsWith('.sql'))
    .sort()
  if (!files.length) throw new Error('D1 migrations are missing')
  for (const file of files) {
    const statements = (await readFile(`drizzle-d1/${file}`, 'utf8'))
      .split('--> statement-breakpoint')
      .map((statement) =>
        statement
          .split('\n')
          .filter((line) => !line.trimStart().startsWith('--'))
          .join('\n')
          .trim(),
      )
      .filter(Boolean)
    for (let offset = 0; offset < statements.length; offset += 50) {
      await db.batch(
        statements
          .slice(offset, offset + 50)
          .map((statement) => db.prepare(statement)),
      )
    }
  }
  // POST: a retried idempotent GET would run the suite twice against one database.
  const response = await runtime.dispatchFetch('http://localhost/verify', {
    method: 'POST',
  })
  const report = await response.json()
  for (const result of report.results ?? []) {
    console.log(
      `${result.passed ? 'PASS' : 'FAIL'} ${result.name} (${result.durationMs} ms)`,
    )
    if (!result.passed) console.error(result.error)
  }
  if (!response.ok || !report.passed) process.exitCode = 1
} finally {
  await runtime.dispose()
}
