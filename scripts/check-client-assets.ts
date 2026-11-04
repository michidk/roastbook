import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const publicDirectory = process.argv[2] ?? '.output/public'
const assetsDirectory = join(publicDirectory, 'assets')
const GENERAL_CHUNK_BUDGET = 500 * 1024
const MAP_CHUNK_BUDGET = 1_100 * 1024
const forbiddenMarkers = [
  '@electric-sql/pglite',
  'pglite.wasm',
  '@aws-sdk/client-s3',
  '@tanstack/ai-openai',
  'node_modules/postgres',
  'S3_SECRET_ACCESS_KEY=',
  'roastbook.user_id',
  'auth_verifications',
  'ai_provider_credentials',
  'AI_CREDENTIAL_ENCRYPTION_KEY',
  'OPENAI_API_KEY=',
]

const files = (await readdir(assetsDirectory))
  .filter((file) => file.endsWith('.js'))
  .map((file) => `assets/${file}`)
const failures: string[] = []
for (const file of await readdir(publicDirectory, { recursive: true }))
  if (/pglite|demo-local\/worker\.js|\.wasm$/.test(file))
    failures.push(`${file} contains a browser SQL engine asset`)

for (const file of files) {
  const path = join(publicDirectory, file)
  const { size } = await stat(path)
  const budget = file.startsWith('assets/maplibre-gl-')
    ? MAP_CHUNK_BUDGET
    : GENERAL_CHUNK_BUDGET
  if (size > budget) {
    failures.push(`${file} is ${size} bytes (budget: ${budget})`)
  }

  const source = await readFile(path, 'utf8')
  for (const marker of forbiddenMarkers) {
    if (source.includes(marker)) {
      failures.push(`${file} contains server-only marker ${marker}`)
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Client asset verification failed:\n${failures.join('\n')}`)
}

console.log(
  `Client assets are within budget (${files.length} JavaScript chunks checked)`,
)
