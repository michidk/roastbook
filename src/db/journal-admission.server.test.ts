import { describe, expect, test } from 'bun:test'
import { JournalAdmission, JournalBusyError } from './journal-admission.server'

describe('journal admission', () => {
  test('allows other accounts past a busy owner and preserves order within the owner', async () => {
    const admission = new JournalAdmission({ maxActive: 2 })
    const releaseFirst = await admission.acquire('first')
    const pending = admission.acquire('first')
    const releaseOther = await admission.acquire('other')
    const order: string[] = []
    void pending.then(() => order.push('first'))
    expect(order).toEqual([])
    releaseOther()
    releaseFirst()
    const releasePending = await pending
    expect(order).toEqual(['first'])
    releasePending()
  })
  test('bounds both the account backlog and the global backlog', async () => {
    const admission = new JournalAdmission({
      maxActive: 1,
      maxPending: 2,
      maxPerOwner: 2,
    })
    const release = await admission.acquire('first')
    const same = admission.acquire('first')
    await expect(admission.acquire('first')).rejects.toBeInstanceOf(
      JournalBusyError,
    )
    const other = admission.acquire('other')
    await expect(admission.acquire('third')).rejects.toBeInstanceOf(
      JournalBusyError,
    )
    release()
    ;(await same)()
    ;(await other)()
  })
  test('removes cancelled and timed out waiters without admitting their work', async () => {
    const admission = new JournalAdmission({ maxActive: 1, queueTimeoutMs: 20 })
    const release = await admission.acquire('first')
    const cancellation = new AbortController()
    const cancelled = admission.acquire('first', cancellation.signal)
    cancellation.abort(new Error('Cancelled fixture'))
    await expect(cancelled).rejects.toThrow('Cancelled fixture')
    await expect(admission.acquire('other')).rejects.toBeInstanceOf(
      JournalBusyError,
    )
    release()
    const recovered = await admission.acquire('other')
    recovered()
    recovered()
    ;(await admission.acquire('first'))()
  })
})
