import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const output = resolve('.output/cloudflare')
const revision =
  process.env.ROASTBOOK_SOURCE_REVISION ||
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
if (!/^[a-f0-9]{40}$/.test(revision))
  throw new Error('ROASTBOOK_SOURCE_REVISION must be a full Git revision')

async function files(directory: string): Promise<string[]> {
  const found: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isSymbolicLink())
      throw new Error('Release artifacts must not contain symlinks')
    if (entry.isDirectory()) found.push(...(await files(path)))
    else if (entry.isFile()) found.push(path)
    else throw new Error('Release artifacts must contain regular files')
  }
  return found.sort()
}
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await cp('dist/server', join(output, 'worker'), { recursive: true })
await cp('dist/client', join(output, 'public'), { recursive: true })
await mkdir(join(output, 'migrations'))
for (const file of await readdir('drizzle-d1')) {
  if (file.endsWith('.sql'))
    await cp(join('drizzle-d1', file), join(output, 'migrations', file))
}
// Deployment configuration belongs to the private repository. Generated local
// bindings are deliberately excluded from the executable release.
await rm(join(output, 'worker/wrangler.json'), { force: true })
const entries = await files(output)
if (!entries.includes(join(output, 'worker/index.js')))
  throw new Error('Cloudflare worker entry was not built')
if (
  !entries.some(
    (file) =>
      relative(output, file).startsWith('migrations/') && file.endsWith('.sql'),
  )
)
  throw new Error('D1 migrations are missing')
const hashes: Record<string, string> = {}
for (const file of entries)
  hashes[relative(output, file)] = createHash('sha256')
    .update(await readFile(file))
    .digest('hex')
await writeFile(
  join(output, 'roastbook-release.json'),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      target: 'cloudflare-workers-d1',
      revision,
      worker: 'worker/index.js',
      assets: 'public',
      migrations: 'migrations',
      compatibilityDate: '2026-11-02',
      compatibilityFlags: ['nodejs_compat', 'global_fetch_strictly_public'],
      images: true,
      durableObjects: ['OAuthCoordinator', 'AccountJobs'],
      files: hashes,
    },
    null,
    2,
  )}\n`,
)
