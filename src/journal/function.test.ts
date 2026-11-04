import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { journalWriteName } from '@/lib/server/journal-sync.server'
import type { JournalFunctionInfo } from './function'

test('every journal function is named after its module and export, and writes can be replayed', async () => {
  const modules = (await readdir('src/journal')).filter(
    (file) =>
      file.endsWith('.ts') &&
      !file.includes('.test.') &&
      !['function.ts', 'codec.ts', 'tables.ts', 'registry.ts'].includes(file),
  )
  let writes = 0
  for (const file of modules) {
    const module = file.replace(/\.ts$/, '')
    const exports: Record<string, unknown> = await import(`./${file}`)
    for (const [name, value] of Object.entries(exports)) {
      const info = (value as { journal?: JournalFunctionInfo } | null)?.journal
      if (!info) continue
      expect(info.name).toBe(`${module}/${name}`)
      if (info.kind === 'write') {
        writes++
        expect(journalWriteName.test(info.name)).toBe(true)
      }
    }
  }
  expect(writes).toBeGreaterThan(40)
  // The server replays writes from every module.
  const registry = await Bun.file('src/journal/registry.ts').text()
  for (const file of modules)
    expect(registry).toContain(`import './${file.replace(/\.ts$/, '')}'`)
})
