import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { InvalidStoragePathError, LocalStorageProvider } from './local'

const temporaryDirectories: string[] = []

async function createProvider() {
  const basePath = await mkdtemp(join(tmpdir(), 'roastbook-storage-'))
  temporaryDirectories.push(basePath)
  return {
    basePath,
    provider: new LocalStorageProvider({ basePath, baseUrl: '/media' }),
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

describe('LocalStorageProvider', () => {
  test('supports valid nested storage paths', async () => {
    const { provider } = await createProvider()
    const storagePath = 'beans/42/photo.jpg'

    await provider.upload(new Blob(['coffee']), storagePath)

    expect(await provider.exists(storagePath)).toBe(true)
    expect(await provider.list()).toEqual([storagePath])
    expect(await provider.list('beans')).toEqual([storagePath])
    expect(await (await provider.download(storagePath)).text()).toBe('coffee')

    await provider.delete(storagePath)
    expect(await provider.exists(storagePath)).toBe(false)
  })

  test.each([
    '../outside.txt',
    'beans/../../outside.txt',
    '%2e%2e/outside.txt',
    '%252e%252e%252foutside.txt',
    '/tmp/outside.txt',
    'C:\\outside.txt',
    'beans/1/photo.jpg\0.txt',
  ])('rejects unsafe path %s', async (storagePath) => {
    const { provider } = await createProvider()

    await expect(provider.exists(storagePath)).rejects.toBeInstanceOf(
      InvalidStoragePathError,
    )
    await expect(provider.download(storagePath)).rejects.toBeInstanceOf(
      InvalidStoragePathError,
    )
    await expect(provider.delete(storagePath)).rejects.toBeInstanceOf(
      InvalidStoragePathError,
    )
    await expect(
      provider.upload(new Blob(['unsafe']), storagePath),
    ).rejects.toBeInstanceOf(InvalidStoragePathError)
  })

  test('does not delete a file outside the storage root', async () => {
    const { basePath, provider } = await createProvider()
    const outsidePath = join(dirname(basePath), `${basename(basePath)}-outside`)
    await writeFile(outsidePath, 'keep')

    try {
      await expect(
        provider.delete(`../${basename(outsidePath)}`),
      ).rejects.toBeInstanceOf(InvalidStoragePathError)
      expect(await readFile(outsidePath, 'utf8')).toBe('keep')
    } finally {
      await rm(outsidePath, { force: true })
    }
  })
})
