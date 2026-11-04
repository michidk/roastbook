import { expect, test } from 'bun:test'
import { checkJournalImports, checkProductModule } from './journal-boundaries'

test('product code cannot import the demo package by alias or relative path', () => {
  for (const target of [
    '@roastbook/journal-demo/local/client',
    '../../packages/journal-demo/src/local/client',
  ]) {
    expect(
      checkJournalImports(
        'src/lib/images.ts',
        `import { demoFunction } from '${target}'`,
      ),
    ).toHaveLength(1)
  }
  expect(
    checkJournalImports(
      'src/lib/image-url.ts',
      "import { localDemoImageUrl } from '@/lib/edition-client'",
    ),
  ).toEqual([])
})

test('shared journal code is independent of application and server implementations', () => {
  for (const target of [
    '@/db/schema',
    '@/lib/server/beans',
    '@roastbook/journal-demo/ui',
    '../../../src/lib/env.server',
    'drizzle-orm',
    'node:fs',
  ]) {
    expect(
      checkJournalImports(
        'packages/journal-client/src/query.ts',
        `export { value } from '${target}'`,
      ),
    ).toHaveLength(1)
  }
  expect(
    checkJournalImports(
      'packages/journal-client/src/query.ts',
      "import { createCollection } from '@tanstack/db'",
    ),
  ).toEqual([])
})

test('emitted product modules exclude demo storage, fixtures and engine', () => {
  for (const id of [
    '/app/packages/journal-demo/src/local/client.ts',
    '/app/src/db/demo-seed.server.ts',
    '/app/node_modules/@electric-sql/pglite/dist/index.js',
  ]) {
    expect(checkProductModule(id)).toContain('demo-only module')
  }
  expect(checkProductModule('/app/src/db/schema.ts')).toBeUndefined()
})

test('dynamic imports follow the same package restrictions', () => {
  expect(
    checkJournalImports(
      'packages/journal-client/src/query.ts',
      "const x = () => import('@/lib/server/beans')",
    ),
  ).toHaveLength(1)
  expect(
    checkJournalImports(
      'src/lib/example.ts',
      "const x = () => import('@roastbook/journal-demo/ui')",
    ),
  ).toHaveLength(1)
})
