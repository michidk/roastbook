import assert from 'node:assert/strict'
import type { CloudflareRuntimeBindings } from '@/cloudflare/context.server'
import { encodeInput } from '@/journal/codec'
import {
  loadJournalRows,
  replayJournalWrite,
  reserveJournalIdentifiers,
} from '@/lib/server/journal-sync.server'
import { fixture } from './verify-journal'

/** Browser writes replay on D1 with their recorded identifiers, once each. */
export async function verifyJournalSync(bindings: CloudflareRuntimeBindings) {
  const first = await fixture(bindings)
  const second = await fixture(bindings)
  const created = await first.run(async () => {
    const before = await loadJournalRows(null)
    const reserved = await reserveJournalIdentifiers([
      'beans',
      'bean_purchases',
    ])
    assert.equal(reserved.beans?.length, 256)
    const recorded = {
      'id:beans': reserved.beans?.slice(0, 1) ?? [],
      'id:bean_purchases': reserved.bean_purchases?.slice(0, 1) ?? [],
    }
    // Identifiers the server did not reserve for this owner never replay.
    await assert.rejects(
      () =>
        replayJournalWrite({
          name: 'beans/createBean',
          input: { name: 'Unreserved' },
          recorded: {
            'id:beans': [9_007_199_254_740_000],
            'id:bean_purchases': recorded['id:bean_purchases'],
          },
          key: crypto.randomUUID(),
          revision: before.revision,
        }),
      /Invalid replayed identifier/,
    )
    const write = {
      name: 'beans/createBean',
      input: await encodeInput({ name: 'Offline on D1', weight: '250' }),
      recorded,
      key: crypto.randomUUID(),
    }
    const applied = await replayJournalWrite({
      ...write,
      revision: before.revision,
    })
    assert.equal(applied.unchanged, true)
    // Another device downloads only the rows this write changed.
    const delta = await loadJournalRows(before.revision, true)
    assert.equal(delta.tables, null)
    assert.deepEqual(
      delta.changes?.beans?.keys,
      recorded['id:beans'].map((id) => ({ id })),
    )
    assert.deepEqual(
      delta.changes?.beans?.rows.map((bean) => bean.name),
      ['Offline on D1'],
    )
    const repeated = await replayJournalWrite({
      ...write,
      revision: applied.revision,
    })
    assert.equal(repeated.unchanged, false)
    const rows = await loadJournalRows(null)
    const saved = rows.tables?.beans?.filter(
      (bean) => bean.name === 'Offline on D1',
    )
    assert.deepEqual(
      saved?.map((bean) => bean.id),
      recorded['id:beans'],
    )
    assert.equal((await loadJournalRows(rows.revision)).tables, null)
    await assert.rejects(() =>
      replayJournalWrite({
        name: 'beans/updateBean',
        input: { id: 2_000_000_000, name: 'Deleted elsewhere' },
        recorded: {},
        key: crypto.randomUUID(),
        revision: rows.revision,
      }),
    )
    return recorded['id:beans'][0] ?? 0
  })
  await second.run(async () => {
    const rows = await loadJournalRows(null)
    assert(!rows.tables?.beans?.some((bean) => bean.name === 'Offline on D1'))
    await assert.rejects(() =>
      replayJournalWrite({
        name: 'beans/updateBean',
        input: { id: created, name: 'Cross-owner' },
        recorded: {},
        key: crypto.randomUUID(),
        revision: rows.revision,
      }),
    )
  })
}
