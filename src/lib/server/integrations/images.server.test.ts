import { expect, test } from 'bun:test'

test('beautification delegates to the shared service with public entity names and reports existing edits', () => {
  const result = Bun.spawnSync(
    [
      process.execPath,
      '-e',
      `
    import { mock } from 'bun:test'
    const calls = []
    const scopes = []
    let edited = { id: 7, storagePath: 'edit.webp', originalStoragePath: 'original.webp' }
    mock.module('@/lib/server/image-beautification.server', () => ({
      prepareEntityImageBeautification: async data => { calls.push(data); return edited }
    }))
    const domain = await import('@/journal/domain/beautified-image')
    mock.module('@/journal/domain/beautified-image', () => ({
      ...domain,
      loadEntityImage: async () => ({ id: 7, storagePath: 'edit.webp', originalStoragePath: 'original.webp' })
    }))
    const { beautifyIntegrationImage } = await import('./src/lib/server/integrations/images.server')
    const context = { require: (resource, access) => scopes.push([resource, access]) }
    const created = await beautifyIntegrationImage({ entityType: 'brews', entityId: 2, imageId: 7 }, context)
    edited = null
    const existing = await beautifyIntegrationImage({ entityType: 'places', entityId: 3, imageId: 7 }, context)
    let denied = false
    try {
      await beautifyIntegrationImage({ entityType: 'gear', entityId: 4, imageId: 7 }, { require: () => { throw new Error('Denied') } })
    } catch { denied = true }
    console.log(JSON.stringify({ calls, scopes, created, existing, denied }))
  `,
    ],
    { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' },
  )
  expect(result.stderr.toString()).toBe('')
  expect(result.exitCode).toBe(0)
  const output = JSON.parse(result.stdout.toString())
  expect(output.calls).toEqual([
    { entityType: 'shots', entityId: 2, imageId: 7, automatic: false },
    { entityType: 'coffee-shops', entityId: 3, imageId: 7, automatic: false },
  ])
  expect(output.scopes).toEqual([
    ['brews', 'write'],
    ['places', 'write'],
  ])
  expect(output.created.status).toBe('beautified')
  expect(output.existing.status).toBe('already_beautified')
  expect(output.existing.image.id).toBe(7)
  expect(output.denied).toBe(true)
})
