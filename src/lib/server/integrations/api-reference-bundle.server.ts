import '@tanstack/react-start/server-only'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

let scalar: Promise<{ script: string; version: string }> | undefined

/** Load the installed browser bundle. Build extensions can embed it instead. */
export function scalarBundle() {
  scalar ??= (async () => {
    const require = createRequire(join(process.cwd(), 'package.json'))
    // The package exports dist/index.js; its browser build sits beside it.
    const dist = dirname(require.resolve('@scalar/api-reference'))
    const manifest = JSON.parse(
      await readFile(join(dist, '..', 'package.json'), 'utf8'),
    ) as { version: string }
    return {
      script: await readFile(join(dist, 'browser', 'standalone.js'), 'utf8'),
      version: manifest.version,
    }
  })()
  return scalar
}
