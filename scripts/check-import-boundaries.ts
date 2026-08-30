import { readdir, readFile } from 'node:fs/promises'
import { dirname, normalize, relative, resolve } from 'node:path'

const sourceRoot = 'src'
const importPattern = /(?:from\s+|import\s*\()(['"])([^'"]+)\1/g
const failures: string[] = []

const files = (
  await readdir(sourceRoot, { recursive: true, withFileTypes: true })
)
  .filter((entry) => entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name))
  .map((entry) => relative('.', `${entry.parentPath}/${entry.name}`))
  .filter((path) => path !== 'src/routeTree.gen.ts')

for (const path of files) {
  const source = await readFile(path, 'utf8')
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
