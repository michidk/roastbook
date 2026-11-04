import { readdir, readFile } from 'node:fs/promises'
import { dirname, normalize, relative, resolve } from 'node:path'

import { checkClientBoundaries } from './client-boundaries'
import { checkJournalImports } from './journal-boundaries'

const importPattern = /(?:from\s+|import\s*\()(['"])([^'"]+)\1/g
const failures: string[] = []

const files = (
  await Promise.all(
    ['src', 'packages'].map(async (root) =>
      (
        await readdir(root, { recursive: true, withFileTypes: true })
      )
        .filter((entry) => entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name))
        .map((entry) => relative('.', `${entry.parentPath}/${entry.name}`)),
    ),
  )
)
  .flat()
  .filter(
    (path) =>
      path !== 'src/routeTree.gen.ts' && !path.includes('/node_modules/'),
  )

for (const path of files) {
  const source = await readFile(path, 'utf8')
  failures.push(
    ...checkClientBoundaries(path, source),
    ...checkJournalImports(path, source),
  )
  for (const match of source.matchAll(importPattern)) {
    const target = match[2]
    if (!target) continue
    const resolvedTarget = target.startsWith('@/')
      ? normalize(`src/${target.slice(2)}`)
      : target.startsWith('.')
        ? relative('.', resolve(dirname(path), target))
        : target

    if (
      path.startsWith('src/lib/') &&
      resolvedTarget.startsWith('src/components/')
    ) {
      failures.push(`${path} must not import UI component ${target}`)
    }

    if (
      path.startsWith('src/modules/') &&
      (resolvedTarget.startsWith('src/routes/') ||
        resolvedTarget.startsWith('src/lib/server/'))
    ) {
      failures.push(`${path} must not import application boundary ${target}`)
    }

    if (
      (path.startsWith('src/components/') ||
        path.startsWith('src/hooks/') ||
        path.startsWith('src/modules/') ||
        path.startsWith('src/routes/')) &&
      resolvedTarget.includes('.server')
    ) {
      failures.push(
        `${path} must not import server-only implementation ${target}`,
      )
    }
  }
}

if (failures.length > 0) {
  throw new Error(
    `Import boundary verification failed:\n${failures.join('\n')}`,
  )
}

console.log(
  `Import boundaries are valid (${files.length} source files checked)`,
)
