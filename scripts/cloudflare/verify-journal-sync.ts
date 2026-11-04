import assert from 'node:assert/strict'
import type { CloudflareRuntimeBindings } from '@/cloudflare/context.server'
import { allocateJournalIds } from '@/db/journal-mutations.server'
import { beanPurchases, beans } from '@/db/schema'
import {
  applyJournalCommand,
  loadJournalSnapshot,
} from '@/lib/server/journal-snapshot.server'
import { executeCommand } from '@/modules/journal/commands'
import { fixture } from './verify-journal'

export async function verifyJournalSync(bindings: CloudflareRuntimeBindings) {
  const first = await fixture(bindings)
  const second = await fixture(bindings)
  const savedResult = await first.run(async () => {
    const before = await loadJournalSnapshot()
    const allocations = {
      beans: await allocateJournalIds(beans),
      beanPurchases: await allocateJournalIds(beanPurchases),
    }
    const command = {
      id: crypto.randomUUID(),
      operation: 'beans/createBean',
      data: { name: 'Shared offline coffee', weight: '250' },
      createdAt: new Date().toISOString(),
      allocations,
    }
    const local = executeCommand(before, structuredClone(command)).state
    const saved = await applyJournalCommand(command, before.serverRevision)
    assert.deepEqual(saved.tables.beans, local.tables.beans)
    assert.deepEqual(saved.tables.beanPurchases, local.tables.beanPurchases)
    const replayed = await applyJournalCommand(command, before.serverRevision)
    assert.equal(replayed.serverRevision, saved.serverRevision)
    assert.equal(saved.serverRevision, before.serverRevision + 1)
    assert.deepEqual(await loadJournalSnapshot(), saved)
    const rename = {
      ...command,
      id: crypto.randomUUID(),
      operation: 'beans/updateBean',
      data: { id: allocations.beans[0] ?? 0, name: 'Renamed' },
    }
    // An older base revision still applies when nothing it touches changed.
    const renamed = await applyJournalCommand(rename, before.serverRevision)
    assert.equal(
      renamed.tables.beans.find((bean) => bean.id === allocations.beans[0])
        ?.name,
      'Renamed',
    )
    const invalid = {
      ...rename,
      id: crypto.randomUUID(),
      data: { ...rename.data, roasterId: 999999999 },
    }
    await assert.rejects(() =>
      applyJournalCommand(invalid, renamed.serverRevision),
    )
    await assert.rejects(
      () => applyJournalCommand(invalid, before.serverRevision),
      /JOURNAL_CONFLICT/,
    )
    assert.deepEqual((await loadJournalSnapshot()).tables, renamed.tables)
    return { saved, rename }
  })
  const other = await second.run(loadJournalSnapshot)
  assert(
    !other.tables.beans.some((bean) => bean.name === 'Shared offline coffee'),
  )
  assert.notEqual(other.mediaNamespace, savedResult.saved.mediaNamespace)
  await second.run(async () => {
    await assert.rejects(() =>
      applyJournalCommand(savedResult.rename, other.serverRevision),
    )
  })
}
