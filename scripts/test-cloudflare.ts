import { resolve } from 'node:path'

const outputDirectory = resolve('.artifacts/qa/cloudflare-verification')
const result = await Bun.build({
  entrypoints: ['scripts/cloudflare/verify-worker.ts'],
  outdir: outputDirectory,
  target: 'node',
  tsconfig: 'tsconfig.cloudflare.json',
})
if (!result.success) {
  for (const diagnostic of result.logs) console.error(diagnostic)
  process.exit(1)
}
const run = Bun.spawn(
  [
    'node',
    'scripts/cloudflare/run-verification.mjs',
    resolve(outputDirectory, 'verify-worker.js'),
  ],
  { stdout: 'inherit', stderr: 'inherit', env: process.env },
)
process.exit(await run.exited)
