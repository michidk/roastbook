import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { MAX_IMAGE_BYTES } from '@/lib/domain-contracts'
import {
  deleteOfflineBlob,
  deleteOfflineBlobsForEntity,
  getOfflineBlob,
  listOfflineBlobs,
  putOfflineBlob,
} from '@/modules/offline/blob-store'
import { resetOfflineDatabaseForTests } from '@/modules/offline/storage'

beforeEach(async () => {
  await resetOfflineDatabaseForTests()
})

afterAll(async () => {
  await resetOfflineDatabaseForTests()
})

function imageFile(name = 'brew.jpg', type = 'image/jpeg') {
  return new File([new Uint8Array([1, 2, 3])], name, { type })
}

describe('offline blob store', () => {
  test('stores and reads files with entity metadata', async () => {
    const record = await putOfflineBlob({
      entityType: 'brew-image',
      entityId: 42,
      file: imageFile(),
    })

    expect(record).toMatchObject({
      entityType: 'brew-image',
      entityId: '42',
      filename: 'brew.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 3,
    })
    expect(await getOfflineBlob(record.key)).toMatchObject({
      filename: 'brew.jpg',
    })
    expect(
      await listOfflineBlobs({ entityType: 'brew-image', entityId: 42 }),
    ).toHaveLength(1)
    expect(
      await listOfflineBlobs({ entityType: 'brew-image', entityId: 7 }),
    ).toHaveLength(0)
  })

  test('rejects unsupported or oversized files', async () => {
    await expect(
      putOfflineBlob({
        entityType: 'brew-image',
        entityId: 1,
        file: imageFile('notes.txt', 'text/plain'),
      }),
    ).rejects.toThrow('cannot be saved offline')

    await expect(
      putOfflineBlob({
        entityType: 'brew-image',
        entityId: 1,
        file: new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'large.jpg', {
          type: 'image/jpeg',
        }),
      }),
    ).rejects.toThrow('too large')
  })

  test('deletes one file or every file for an entity', async () => {
    const first = await putOfflineBlob({
      entityType: 'brew-image',
      entityId: 1,
      file: imageFile('one.jpg'),
    })
    const second = await putOfflineBlob({
      entityType: 'brew-image',
      entityId: 1,
      file: imageFile('two.jpg'),
    })

    await deleteOfflineBlob(first.key)
    expect(await getOfflineBlob(first.key)).toBeUndefined()
    expect(await getOfflineBlob(second.key)).toBeDefined()

    await deleteOfflineBlobsForEntity('brew-image', 1)
    expect(await getOfflineBlob(second.key)).toBeUndefined()
  })
})
