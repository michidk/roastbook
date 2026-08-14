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

const result = Bun.spawnSync(['bun', 'test', 'integration'], {
  env: process.env,
  stdout: 'inherit',
  stderr: 'inherit',
})

process.exit(result.exitCode)
