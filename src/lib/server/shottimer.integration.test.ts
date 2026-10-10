import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { db } from '@/db'
import { shottimer } from '@/db/schema'
import {
  dismissShottimerShot,
  loadPendingShottimerShot,
  regenerateShottimerToken,
  setShottimerEnabled,
  setShottimerTarget,
} from '@/lib/server/shottimer.server'
import {
  handleShottimerShotRequest,
  handleShottimerTargetRequest,
} from '@/lib/server/shottimer-api'

const integrationDescribe = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip

function postShot(token: string | null, body: unknown) {
  return handleShottimerShotRequest(
    new Request('http://roastbook.test/api/shottimer/shots', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(body),
    }),
  )
}

integrationDescribe('shottimer device API', () => {
  let saved: (typeof shottimer.$inferSelect)[] = []

  beforeAll(async () => {
    saved = await db.select().from(shottimer)
    await db.delete(shottimer)
  })

  afterAll(async () => {
    await db.delete(shottimer)
    if (saved.length > 0) await db.insert(shottimer).values(saved)
  })

  test('rejects requests until enabled with a matching token', async () => {
    const token = await regenerateShottimerToken()
    expect((await postShot(token, { seconds: 27 })).status).toBe(401)

    await setShottimerEnabled(true)
    expect((await postShot(null, { seconds: 27 })).status).toBe(401)
    expect((await postShot('wrong', { seconds: 27 })).status).toBe(401)
    expect((await postShot(token, { seconds: -1 })).status).toBe(400)

    const replacement = await regenerateShottimerToken()
    expect((await postShot(token, { seconds: 27 })).status).toBe(401)
    expect((await postShot(replacement, { seconds: 27.456 })).status).toBe(204)
  })

  test('offers the latest shot until it is dismissed', async () => {
    const pending = await loadPendingShottimerShot()
    expect(pending?.seconds).toBe(27.46)
    if (!pending) throw new Error('Expected a pending shot')

    await dismissShottimerShot(pending.receivedAt)
    expect(await loadPendingShottimerShot()).toBeNull()
  })

  test('serves the reported target time', async () => {
    const token = await regenerateShottimerToken()
    await setShottimerTarget(28)
    const response = await handleShottimerTargetRequest(
      new Request('http://roastbook.test/api/shottimer/target', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    )
    expect(await response.json()).toEqual({ targetSeconds: 28 })
  })
})
