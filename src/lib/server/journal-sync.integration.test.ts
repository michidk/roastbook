import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { authUsers, beans, journalCommandReceipts } from '@/db/schema'
import { encodeInput } from '@/journal/codec'
import {
  loadJournalRows,
  replayJournalWrite,
  reserveJournalIdentifiers,
} from './journal-sync.server'

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip
const identity = (): JournalIdentity => ({
  id: randomUUID(),
  email: `${randomUUID()}@example.test`,
  role: 'user',
  authentication: true,
  authenticatedAt: new Date(),
})
const first = identity()
const second = identity()

/** Identifiers the server reserves for this owner, as a browser would get them. */
async function reserved(table: string) {
  const ids = await withJournal(first, () => reserveJournalIdentifiers([table]))
  return ids[table] ?? []
}

suite('journal sync replays browser writes on PostgreSQL', () => {
  beforeAll(async () => {
    await getControlDb()
      .insert(authUsers)
      .values(
        [first, second].map((user) => ({
          id: user.id,
          email: user.email,
          emailVerified: true,
          journalInitializedAt: new Date(),
        })),
      )
  })
  afterAll(async () => {
    await getControlDb()
      .delete(authUsers)
      .where(inArray(authUsers.id, [first.id, second.id]))
  })

  test('a recorded create keeps its identifiers, applies once and reports other changes', async () => {
    const [beanId] = await reserved('beans')
    const [purchaseId] = await reserved('bean_purchases')
    const write = {
      name: 'beans/createBean',
      input: await encodeInput({ name: 'Offline bean', weight: '250' }),
      recorded: { 'id:beans': [beanId], 'id:bean_purchases': [purchaseId] },
      key: randomUUID(),
    }
    const before = await withJournal(first, () => loadJournalRows(null))
    const applied = await withJournal(first, () =>
      replayJournalWrite({ ...write, revision: before.revision }),
    )
    expect(applied.unchanged).toBe(true)
    expect(applied.revision).toBeGreaterThan(before.revision)

    const rows = await withJournal(first, () => loadJournalRows(null))
    expect(rows.tables?.beans?.map((bean) => [bean.id, bean.name])).toEqual([
      [beanId, 'Offline bean'],
    ])
    expect(rows.tables?.bean_purchases?.[0]?.id).toBe(purchaseId)

    // A lost response retries the same key: nothing is applied twice.
    const repeated = await withJournal(first, () =>
      replayJournalWrite({ ...write, revision: applied.revision }),
    )
    expect(repeated.unchanged).toBe(false)
    const again = await withJournal(first, () => loadJournalRows(null))
    expect(again.tables?.beans).toHaveLength(1)

    // Same revision: the browser can skip downloading.
    const unchanged = await withJournal(first, () =>
      loadJournalRows(again.revision),
    )
    expect(unchanged.tables).toBeNull()

    // A write based on an older revision still applies but reports the gap.
    const renamed = await withJournal(first, () =>
      replayJournalWrite({
        name: 'beans/updateBean',
        input: { id: beanId, name: 'Renamed' },
        recorded: {},
        key: randomUUID(),
        revision: before.revision,
      }),
    )
    expect(renamed.unchanged).toBe(false)
  })

  test('a write that no longer applies changes nothing and leaves no receipt', async () => {
    const key = randomUUID()
    await expect(
      withJournal(first, () =>
        replayJournalWrite({
          name: 'beans/updateBean',
          input: { id: 2_000_000_000, name: 'Deleted elsewhere' },
          recorded: {},
          key,
          revision: 0,
        }),
      ),
    ).rejects.toThrow()
    const receipts = await getControlDb()
      .select()
      .from(journalCommandReceipts)
      .where(eq(journalCommandReceipts.commandId, key))
    expect(receipts).toEqual([])
  })

  test('owners stay isolated: no rows, no writes across journals', async () => {
    const other = await withJournal(second, () => loadJournalRows(null))
    expect(other.tables?.beans ?? []).toEqual([])
    const [firstBean] = await getControlDb()
      .select({ id: beans.id })
      .from(beans)
      .where(eq(beans.ownerId, first.id))
    await expect(
      withJournal(second, () =>
        replayJournalWrite({
          name: 'beans/updateBean',
          input: { id: firstBean?.id ?? 0, name: 'Cross-owner' },
          recorded: {},
          key: randomUUID(),
          revision: other.revision,
        }),
      ),
    ).rejects.toThrow()
  })

  test('identifiers the server did not reserve for this owner never replay', async () => {
    const [purchaseId] = await reserved('bean_purchases')
    const [othersBean] = await withJournal(second, () =>
      reserveJournalIdentifiers(['beans']),
    ).then((ids) => ids.beans ?? [])
    for (const beanId of [othersBean, 2_000_000_000])
      await expect(
        withJournal(first, () =>
          replayJournalWrite({
            name: 'beans/createBean',
            input: { name: 'Unreserved' },
            recorded: {
              'id:beans': [beanId],
              'id:bean_purchases': [purchaseId],
            },
            key: randomUUID(),
            revision: 0,
          }),
        ),
      ).rejects.toThrow('Invalid replayed identifier')
  })

  test('unknown or read operations are never replayed', async () => {
    for (const name of ['beans/getBeans', 'nothing/here', '../../db/index'])
      await expect(
        withJournal(first, () =>
          replayJournalWrite({
            name,
            input: null,
            recorded: {},
            key: randomUUID(),
            revision: 0,
          }),
        ),
      ).rejects.toThrow()
  })

  test('a recorded picture path must match its record and must be new', async () => {
    const sharp = (await import('sharp')).default
    const bytes = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#7a4a2a' },
    })
      .webp()
      .toBuffer()
    const rows = await withJournal(first, () => loadJournalRows(null))
    const purchase = rows.tables?.bean_purchases?.[0]
    if (!purchase) throw new Error('Expected a bean purchase')
    const [imageId] = await reserved('bean_images')
    const path = `beans/${purchase.id}/${Date.now()}-${randomUUID()}.webp`
    const upload = (recordedPath: string) =>
      withJournal(first, () =>
        replayJournalWrite({
          name: 'images/uploadEntityImageBase64',
          input: {
            entityType: 'bean-purchases',
            entityId: purchase.id,
            fileBase64: bytes.toString('base64'),
            filename: 'bag.webp',
            mimeType: 'image/webp',
            sizeBytes: bytes.byteLength,
          },
          recorded: {
            storagePath: [recordedPath],
            'id:bean_images': [imageId],
          },
          key: randomUUID(),
          revision: 0,
        }),
      )
    await expect(upload('beans/1/../../etc/passwd')).rejects.toThrow(
      'Invalid replayed storage path',
    )
    await expect(
      upload(path.replace(/^beans\/\d+/, 'beans/999')),
    ).rejects.toThrow('Invalid replayed storage path')
    await upload(path)
    const stored = await withJournal(first, () => loadJournalRows(null))
    expect(
      stored.tables?.bean_images?.map((image) => image.storagePath),
    ).toEqual([path])
    // Replaying the same path for another record must neither overwrite nor delete it.
    await expect(upload(path)).rejects.toThrow()
    const { getStorage } = await import('@/lib/storage')
    for (const stored of [path, path.replace(/\.webp$/, '.thumb.webp')])
      expect(await getStorage().exists(stored)).toBe(true)
  })
})
