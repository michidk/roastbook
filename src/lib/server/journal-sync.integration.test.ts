import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { JournalCommand } from '@roastbook/journal-domain/state'
import { inArray } from 'drizzle-orm'
import { getControlDb } from '@/db/connection.server'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { allocateJournalIds } from '@/db/journal-mutations.server'
import {
  authUsers,
  beanImages,
  beanPurchases,
  beans,
  journalCommandReceipts,
  journalSyncRevisions,
} from '@/db/schema'
import { getStoredImagePaths } from '@/lib/image-path'
import { journalImageDigest } from '@/lib/journal-image-digest'
import { getStorage } from '@/lib/storage'
import { executeCommand } from '@/modules/journal/commands'
import { localImageUploadSchema } from '@/modules/journal/images'
import {
  applyJournalCommand,
  loadJournalSnapshot,
  prepareJournalWrite,
} from './journal-snapshot.server'
import { drainMediaCleanupQueue } from './media-lifecycle.server'

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip
const first: JournalIdentity = {
  id: crypto.randomUUID(),
  email: `${crypto.randomUUID()}@example.test`,
  role: 'user',
  authentication: true,
  authenticatedAt: new Date(),
}
const second: JournalIdentity = {
  ...first,
  id: crypto.randomUUID(),
  email: `${crypto.randomUUID()}@example.test`,
}
suite('shared journal transport with real PostgreSQL and journal RLS', () => {
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
    const owners = [first.id, second.id]
    await getControlDb()
      .delete(beanPurchases)
      .where(inArray(beanPurchases.ownerId, owners))
    await getControlDb().delete(beans).where(inArray(beans.ownerId, owners))
    await getControlDb()
      .delete(journalCommandReceipts)
      .where(inArray(journalCommandReceipts.ownerId, owners))
    await getControlDb()
      .delete(journalSyncRevisions)
      .where(inArray(journalSyncRevisions.ownerId, owners))
    await getControlDb().delete(authUsers).where(inArray(authUsers.id, owners))
  })
  test('commits related records once after a lost response, isolates owners, merges unrelated changes and rejects stale writes', async () => {
    // Like the client, which reserves identifiers before its first download.
    const initial = await withJournal(first, async () => {
      await prepareJournalWrite()
      return loadJournalSnapshot()
    })
    const ids = await withJournal(first, async () => ({
      beans: await allocateJournalIds(beans, 2),
      beanPurchases: await allocateJournalIds(beanPurchases, 2),
    }))
    const command: JournalCommand = {
      id: crypto.randomUUID(),
      operation: 'beans/createBean',
      data: { name: 'Offline journal bean', weight: '250' },
      createdAt: new Date().toISOString(),
      allocations: ids,
    }
    const local = executeCommand(initial, structuredClone(command))
    expect(local.state.tables.beans).toHaveLength(1)
    const committed = await withJournal(first, () =>
      applyJournalCommand(command, initial.serverRevision),
    )
    expect(committed.tables.beans).toEqual(local.state.tables.beans)
    expect(committed.tables.beanPurchases).toEqual(
      local.state.tables.beanPurchases,
    )
    expect(committed.serverRevision).toBe(initial.serverRevision + 1)
    // The returned journal is what a fresh read sees.
    expect(committed).toEqual(await withJournal(first, loadJournalSnapshot))
    const repeated = await withJournal(first, () =>
      applyJournalCommand(command, initial.serverRevision),
    )
    expect(repeated.tables.beans).toHaveLength(1)
    expect(repeated.serverRevision).toBe(committed.serverRevision)
    expect(
      (await withJournal(second, loadJournalSnapshot)).tables.beans,
    ).toEqual([])
    const beanId = ids.beans[0] ?? 0
    // An older base revision is merged when the command still applies.
    const renamed = await withJournal(first, () =>
      applyJournalCommand(
        {
          ...command,
          id: crypto.randomUUID(),
          operation: 'beans/updateBean',
          data: { id: beanId, name: 'Renamed elsewhere' },
        },
        initial.serverRevision,
      ),
    )
    expect(renamed.tables.beans[0]?.name).toBe('Renamed elsewhere')
    expect(renamed.serverRevision).toBe(committed.serverRevision + 1)
    // A command whose record was deleted on another device is a conflict.
    const removedId = ids.beans[1] ?? 0
    const created = await withJournal(first, () =>
      applyJournalCommand(
        {
          ...command,
          id: crypto.randomUUID(),
          data: { name: 'Deleted elsewhere', weight: '250' },
          allocations: {
            beans: [removedId],
            beanPurchases: [ids.beanPurchases[1] ?? 0],
          },
        },
        renamed.serverRevision,
      ),
    )
    await withJournal(first, () =>
      applyJournalCommand(
        {
          ...command,
          id: crypto.randomUUID(),
          operation: 'beans/deleteBean',
          data: removedId,
          allocations: {},
        },
        created.serverRevision,
      ),
    )
    const stale = {
      ...command,
      id: crypto.randomUUID(),
      operation: 'beans/updateBean',
      data: { id: removedId, name: 'Conflict' },
      allocations: {},
    }
    await expect(
      withJournal(first, () =>
        applyJournalCommand(stale, created.serverRevision),
      ),
    ).rejects.toThrow('JOURNAL_CONFLICT')
    await expect(
      withJournal(second, () => applyJournalCommand(stale, 0)),
    ).rejects.toThrow()
    expect(
      (await withJournal(first, loadJournalSnapshot)).tables.beans.map(
        (bean) => bean.name,
      ),
    ).toEqual(['Renamed elsewhere'])
  })
  test('a failed relationship never persists a receipt or partial records', async () => {
    const before = await withJournal(first, loadJournalSnapshot)
    const command: JournalCommand = {
      id: crypto.randomUUID(),
      operation: 'beans/updateBean',
      data: { id: before.tables.beans[0]?.id ?? 0, roasterId: 999999 },
      createdAt: new Date().toISOString(),
      allocations: {},
    }
    await expect(
      withJournal(first, () =>
        applyJournalCommand(command, before.serverRevision),
      ),
    ).rejects.toThrow()
    const after = await withJournal(first, loadJournalSnapshot)
    expect(after.tables).toEqual(before.tables)
    expect(after.serverRevision).toBe(before.serverRevision)
  })
  test('real WebP variants synchronize once, reject altered bytes, isolate owners and clean deleted images after commit', async () => {
    const sharp = (await import('sharp')).default
    const bytes = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#8c5a38' },
    })
      .webp()
      .toBuffer()
    const files = Array.from({ length: 3 }, () => bytes.toString('base64'))
    const initial = await withJournal(first, loadJournalSnapshot)
    const purchase = initial.tables.beanPurchases[0]
    if (!purchase) throw new Error('Expected the related coffee purchase')
    const ids = await withJournal(first, () => allocateJournalIds(beanImages))
    const command: JournalCommand = {
      id: crypto.randomUUID(),
      operation: 'images/uploadEntityImage',
      data: {
        entityType: 'bean-purchases',
        entityId: purchase.id,
        filename: 'local-coffee.webp',
        files,
        digest: await journalImageDigest(files),
      },
      createdAt: new Date().toISOString(),
      allocations: { beanImages: ids },
    }
    const storage = getStorage()
    let paths: string[] = []
    try {
      await expect(
        withJournal(first, () =>
          applyJournalCommand(
            {
              ...command,
              data: {
                ...localImageUploadSchema.parse(command.data),
                digest: '0'.repeat(64),
              },
            },
            initial.serverRevision,
          ),
        ),
      ).rejects.toThrow('content digest')
      const saved = await withJournal(first, () =>
        applyJournalCommand(command, initial.serverRevision),
      )
      const image = saved.tables.beanImages[0]
      if (!image) throw new Error('The image did not synchronize')
      paths = getStoredImagePaths([image.storagePath])
      expect(image.storagePath).toStartWith(
        `journal/${initial.mediaNamespace}/`,
      )
      for (const path of paths) expect(await storage.exists(path)).toBe(true)
      const replay = await withJournal(first, () =>
        applyJournalCommand(command, initial.serverRevision),
      )
      expect(replay.tables.beanImages).toHaveLength(1)
      expect(replay.serverRevision).toBe(saved.serverRevision)
      await expect(
        withJournal(second, () => applyJournalCommand(command, 0)),
      ).rejects.toThrow()
      expect(
        (await withJournal(second, loadJournalSnapshot)).tables.beanImages,
      ).toEqual([])
      const deletion: JournalCommand = {
        id: crypto.randomUUID(),
        operation: 'images/deleteEntityImage',
        data: {
          entityType: 'bean-purchases',
          entityId: purchase.id,
          imageId: image.id,
        },
        createdAt: new Date().toISOString(),
        allocations: {},
      }
      await expect(
        withJournal(first, async () => {
          await applyJournalCommand(deletion, saved.serverRevision)
          throw new Error('Rollback after image deletion')
        }),
      ).rejects.toThrow('Rollback after image deletion')
      expect(
        (await withJournal(first, loadJournalSnapshot)).tables.beanImages,
      ).toHaveLength(1)
      for (const path of paths) expect(await storage.exists(path)).toBe(true)
      const deleted = await withJournal(first, () =>
        applyJournalCommand(deletion, saved.serverRevision),
      )
      expect(deleted.tables.beanImages).toEqual([])
      for (const path of paths) expect(await storage.exists(path)).toBe(true)
      await withJournal(first, () => drainMediaCleanupQueue())
      for (const path of paths) expect(await storage.exists(path)).toBe(false)
    } finally {
      for (const path of paths)
        if (await storage.exists(path)) await storage.delete(path)
    }
  })
})
