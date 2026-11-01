import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

test('demo build removes install/offline assets and retires old shell caches without handling fetches', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'roastbook-demo-pwa-'))
  try {
    await writeFile(join(directory, 'manifest.json'), '{}')
    await writeFile(join(directory, 'offline.html'), 'offline')
    const result = Bun.spawnSync([
      process.execPath,
      'scripts/build-demo-pwa.ts',
      directory,
    ])
    expect(result.exitCode).toBe(0)
    expect(await Bun.file(join(directory, 'manifest.json')).exists()).toBe(
      false,
    )
    expect(await Bun.file(join(directory, 'offline.html')).exists()).toBe(false)
    const handlers = new Map<
      string,
      (event: { waitUntil: (work: Promise<void>) => void }) => void
    >()
    const deleted: string[] = []
    let unregistered = false
    runInNewContext(await readFile(join(directory, 'sw.js'), 'utf8'), {
      self: {
        addEventListener: (
          name: string,
          handler: (event: {
            waitUntil: (work: Promise<void>) => void
          }) => void,
        ) => handlers.set(name, handler),
        registration: {
          unregister: async () => {
            unregistered = true
          },
        },
        clients: { claim: async () => {} },
      },
      caches: {
        keys: async () => [
          'roastbook-precache-old',
          'roastbook-documents-old',
          'unrelated-app',
        ],
        delete: async (name: string) => {
          deleted.push(name)
        },
      },
    })
    expect(handlers.has('fetch')).toBe(false)
    let activation: Promise<void> | undefined
    handlers.get('activate')?.({
      waitUntil: (work) => {
        activation = work
      },
    })
    await activation
    expect(unregistered).toBe(true)
    expect(deleted).toEqual([
      'roastbook-precache-old',
      'roastbook-documents-old',
    ])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
