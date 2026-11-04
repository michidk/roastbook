import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const publicDirectory = process.argv[2] ?? '.output/public'
const assetsDirectory = join(publicDirectory, 'assets')
const GENERAL_CHUNK_BUDGET = 500 * 1024
const MAP_CHUNK_BUDGET = 1_100 * 1024
// The journal database worker bundles PGlite and every migration.
const JOURNAL_WORKER_BUDGET = 1_024 * 1024
const secretMarkers = [
  '@aws-sdk/client-s3',
  '@tanstack/ai-openai',
  'node_modules/postgres',
  'S3_SECRET_ACCESS_KEY=',
  'AI_CREDENTIAL_ENCRYPTION_KEY',
  'OPENAI_API_KEY=',
]
// The page builds journal SQL, but only the journal worker loads the engine.
const engineMarkers = ['@electric-sql/pglite/dist/pglite', 'pglite.data']
const isJournalWorker = (source: string) =>
  source.includes('roastbook_local.migrations')

const files = (await readdir(assetsDirectory))
  .filter((file) => file.endsWith('.js'))
  .map((file) => `assets/${file}`)
const failures: string[] = []
for (const file of await readdir(publicDirectory, { recursive: true }))
  if (
    /\.wasm$/.test(file) &&
    !/^assets\/(pglite|initdb)-[\w-]+\.wasm$/.test(file)
  )
    failures.push(`${file} is an unexpected WebAssembly asset`)

for (const file of files) {
  const path = join(publicDirectory, file)
  const { size } = await stat(path)
  const source = await readFile(path, 'utf8')
  const worker = isJournalWorker(source)
  const budget = worker
    ? JOURNAL_WORKER_BUDGET
    : file.startsWith('assets/maplibre-gl-')
      ? MAP_CHUNK_BUDGET
      : GENERAL_CHUNK_BUDGET
  if (size > budget) {
    failures.push(`${file} is ${size} bytes (budget: ${budget})`)
  }

  for (const marker of worker
    ? secretMarkers
    : [...secretMarkers, ...engineMarkers]) {
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
