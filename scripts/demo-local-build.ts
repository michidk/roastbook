import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { parse } from '@babel/parser'
import type { BunPlugin } from 'bun'

export const DEMO_JOURNAL_MODULES = [
  'beans',
  'bean-purchases',
  'brewing-methods',
  'cafe-visits',
  'coffee-shops',
  'command-search',
  'drink-options',
  'gear',
  'gear-sets',
  'recipes',
  'roasters',
  'settings',
  'shots',
  'stats',
  'suggestions',
  'taste-tags',
] as const

const domainHelpers = new Set([
  'accessory-gear.server',
  'bean-purchases.server',
  'client-operations.server',
  'drink-options.server',
  'entity-image-records.server',
  'gear-properties.server',
  'media-lifecycle.server',
  'portable-query.server',
  'recipe-mutations.server',
  'resource-limits.server',
  'revision.server',
  'settings-contract',
  'settings.server',
  'shot-list-contract.server',
  'shot-parameter-projection',
  'shot-recipes.server',
  'shot-sort.server',
  'shots-operations.server',
  'stats-detail.server',
  'stats-exploration.server',
  'stats-overview.server',
  'stats-scan.server',
  'stats-sql.server',
  'stats-visits.server',
])

const replacements: Record<string, string> = {
  '@tanstack/react-start': 'function',
  '@/db': 'database',
  '@/db/journal-scope.server': 'scope',
  '@/db/journal-context.server': 'scope',
  '@/db/journal-mutations.server': 'mutations',
  '@/lib/server/ai-operations.server': 'integrations',
  '@/lib/server/database-error.server': 'integrations',
  '@/lib/server/favicon-cache.server': 'integrations',
  '@/lib/server/stats-cache': 'integrations',
  '@/lib/storage': 'media',
  '@/lib/thumbnail-image': 'integrations',
  '@/lib/server/images': 'images',
  '@/lib/server/image-storage.server': 'images',
  '@/lib/server/replication': 'replication',
  '@/lib/server/replication-shared': 'replication',
}

export function serverFunctionNames(source: string): string[] {
  const file = parse(source, { sourceType: 'module', plugins: ['typescript'] })
  return file.program.body.flatMap((node) => {
    if (
      node.type !== 'ExportNamedDeclaration' ||
      node.declaration?.type !== 'VariableDeclaration'
    )
      return []
    return node.declaration.declarations.flatMap((declaration) =>
      declaration.id.type === 'Identifier' &&
      declaration.init &&
      /\bcreateServerFn\s*\(/.test(
        source.slice(declaration.init.start ?? 0, declaration.init.end ?? 0),
      )
        ? [declaration.id.name]
        : [],
    )
  })
}

/** Fail closed: only these domain modules can enter the demo worker. */
export function demoJournalBuildPlugin(registry: string): BunPlugin {
  return {
    name: 'demo-local-journal-boundary',
    setup(build) {
      build.onResolve({ filter: /^demo-local-registry$/ }, () => ({
        path: 'registry',
        namespace: 'demo',
      }))
      build.onLoad({ filter: /^registry$/, namespace: 'demo' }, () => ({
        contents: registry,
        loader: 'ts',
        resolveDir: resolve('.'),
      }))
      build.onResolve(
        { filter: /^@tanstack\/react-start\/server-only$/ },
        () => ({ path: 'empty', namespace: 'demo' }),
      )
      build.onLoad({ filter: /^empty$/, namespace: 'demo' }, () => ({
        contents: '',
        loader: 'js',
      }))
      build.onResolve(
        { filter: /^(?:@\/|\.\.?\/|@tanstack\/react-start$)/ },
        ({ path, importer }) => {
          const absolute = path.startsWith('@/')
            ? resolve('src', path.slice(2))
            : path.startsWith('.')
              ? resolve(dirname(importer), path)
              : path
          const canonical = absolute.startsWith(`${resolve('src')}/`)
            ? `@/${relative(resolve('src'), absolute).replace(/\.ts$/, '')}`
            : path
          const replacement = replacements[canonical]
          if (replacement)
            return { path: resolve(`src/lib/demo/local/${replacement}.ts`) }
          if (canonical.startsWith('@/lib/server/')) {
            const name = canonical.slice('@/lib/server/'.length)
            if (
              !domainHelpers.has(name) &&
              !DEMO_JOURNAL_MODULES.some((module) => module === name)
            )
              throw new Error(
                `Server implementation cannot enter browser demo: ${canonical}`,
              )
          } else if (
            canonical.startsWith('@/db/') &&
            canonical !== '@/db/schema'
          ) {
            throw new Error(
              `Database implementation cannot enter browser demo: ${canonical}`,
            )
          } else if (/\.server(?:\.|$)/.test(canonical)) {
            throw new Error(
              `Server implementation cannot enter browser demo: ${canonical}`,
            )
          }
          if (path.startsWith('@/'))
            return {
              path: absolute.endsWith('.ts') ? absolute : `${absolute}.ts`,
            }
          return undefined
        },
      )
      build.onResolve(
        {
          filter:
            /^(?:node:|postgres$|sharp$|@aws-sdk\/|@tanstack\/ai|better-auth)/,
        },
        ({ path, importer }) => {
          if (
            path.startsWith('node:') &&
            importer.includes('/node_modules/@electric-sql/pglite/')
          )
            return { path, external: true }
          throw new Error(
            `Integration dependency cannot enter browser demo: ${path}`,
          )
        },
      )
      build.onLoad({ filter: /\/src\/db\/schema\.ts$/ }, async ({ path }) => {
        const source = await readFile(path, 'utf8')
        const file = parse(source, {
          sourceType: 'module',
          plugins: ['typescript'],
        })
        const excluded = new Set([
          'shottimer',
          'mcpSettings',
          'mcpAuditEvents',
          'aiUsage',
          'aiRequestLogs',
        ])
        const declarations = []
        for (const node of file.program.body) {
          if (
            node.type === 'ExportNamedDeclaration' &&
            node.declaration?.type === 'VariableDeclaration'
          ) {
            const name = node.declaration.declarations[0]?.id
            if (name?.type === 'Identifier' && name.name === 'authUsers') break
            if (name?.type === 'Identifier' && excluded.has(name.name)) continue
          }
          declarations.push(source.slice(node.start ?? 0, node.end ?? 0))
        }
        return {
          contents: declarations
            .join('\n')
            .replace(
              /coalesce\(nullif\(current_setting\('roastbook.user_id', true\), ''\), 'local'\)/g,
              "'local'",
            ),
          loader: 'ts',
        }
      })
    },
  }
}

export async function buildDemoJournal({
  entrypoint = 'src/lib/demo/local/worker.ts',
  target = 'browser',
  outdir = '.demo-build/client',
}: {
  entrypoint?: string
  target?: 'browser' | 'bun'
  outdir?: string
} = {}) {
  const registry = await Promise.all(
    DEMO_JOURNAL_MODULES.map(async (name, index) => {
      const source = await readFile(`src/lib/server/${name}.ts`, 'utf8')
      const names = serverFunctionNames(source)
      return { name, index, names }
    }),
  )
  const contents = [
    ...registry.map(
      ({ name, index }) =>
        `import * as module${index} from '@/lib/server/${name}'`,
    ),
    `import * as images from '@/lib/demo/local/images'`,
    `import { loadAppSettings } from '@/lib/server/settings.server'`,
    'export const operations = new Map([',
    ...registry.flatMap(({ name, index, names }) =>
      names.map(
        (method) =>
          `[${JSON.stringify(`${name}/${method}`)}, module${index}.${method}],`,
      ),
    ),
    ...[
      'uploadEntityImage',
      'uploadEntityImageBase64',
      'deleteEntityImage',
      'setImageAsThumbnail',
      'getImageUploadPolicy',
    ].map((name) => `[${JSON.stringify(`images/${name}`)}, images.${name}],`),
    `['internal-stats/getInternalStats', images.getInternalStats],`,
    `['app-settings/getAppSettings', { method: 'GET', run: async () => ({ ...await loadAppSettings(), journalOwner: 'demo', account: null }) }],`,
    '])',
  ].join('\n')
  const result = await Bun.build({
    entrypoints: [entrypoint],
    outdir,
    target,
    format: 'esm',
    minify: target === 'browser',
    splitting: true,
    naming: { entry: '[name].js', chunk: '[name]-[hash].[ext]' },
    define: { __ROASTBOOK_DEMO_MODE__: 'true' },
    plugins: [demoJournalBuildPlugin(contents)],
  })
  if (!result.success)
    throw new AggregateError(result.logs, 'Could not build the browser journal')
  return result
}

export async function prepareDemoAssets({
  outdir,
  snapshot,
}: {
  outdir: string
  snapshot: string
}) {
  await mkdir(outdir, { recursive: true })
  for (const filename of ['pglite.data', 'pglite.wasm', 'initdb.wasm'])
    await copyFile(
      resolve('node_modules/@electric-sql/pglite/dist', filename),
      resolve(outdir, filename),
    )
  await copyFile(snapshot, resolve(outdir, 'seed.tar.gz'))
  const migrations = (await readdir('drizzle'))
    .filter((file) => file.endsWith('.sql'))
    .sort()
  await writeFile(
    resolve(outdir, 'migrations.json'),
    JSON.stringify(
      await Promise.all(
        migrations.map(async (name) => ({
          name,
          sql: await readFile(resolve('drizzle', name), 'utf8'),
        })),
      ),
    ),
  )
}

if (import.meta.main) {
  await rm('.demo-build/client', { recursive: true, force: true })
  await prepareDemoAssets({
    outdir: '.demo-build/client',
    snapshot: '.demo-build/demo-db.tar.gz',
  })
  await buildDemoJournal()
}
