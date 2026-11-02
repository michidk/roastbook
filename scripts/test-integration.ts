export {}

const requiredEnvironmentVariables = [
  'TEST_DATABASE_URL',
  'TEST_S3_ENDPOINT',
  'TEST_S3_ACCESS_KEY_ID',
  'TEST_S3_SECRET_ACCESS_KEY',
  'TEST_S3_BUCKET',
] as const

const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
  (name) => !process.env[name],
)

if (missingEnvironmentVariables.length > 0) {
  console.error(
    `Integration tests require: ${missingEnvironmentVariables.join(', ')}`,
  )
  process.exit(1)
}

// Authentication and provider configuration are cached per process. Isolate
// suites so one fixture cannot redirect another suite's requests or credentials.
const files = await Array.fromAsync(
  new Bun.Glob('src/**/*.integration.test.ts').scan('.'),
)
let failed = false
for (const file of files.sort()) {
  const result = Bun.spawnSync(['bun', 'test', `./${file}`], {
    env: {
      ...process.env,
      SSR: 'true',
      AI_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 31).toString('base64'),
    },
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if (result.exitCode !== 0) failed = true
}
process.exit(failed ? 1 : 0)
