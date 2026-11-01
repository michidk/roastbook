import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { getControlDb } from '@/db/connection.server'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { authUsers, shottimer } from '@/db/schema'
import { handleJournalRequest } from '@/lib/server/auth/request.server'
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
  const request = new Request('http://roastbook.test/api/shottimer/shots', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  })
  return handleJournalRequest(request, () =>
    handleShottimerShotRequest(request),
  )
}

integrationDescribe('shottimer device API', () => {
  const identity: JournalIdentity = {
    id: `device-${crypto.randomUUID()}`,
    name: 'Device test',
    email: 'device@example.test',
    role: 'user',
    authentication: false,
    authenticatedAt: null,
  }
  const scoped = <T>(work: () => Promise<T>) => withJournal(identity, work)
  beforeAll(async () => {
    await getControlDb()
      .insert(authUsers)
      .values({
        id: identity.id,
        name: identity.name,
        email: `${identity.id}@example.test`,
      })
  })
  afterAll(async () => {
    await scoped(async () => {
      await db.delete(shottimer)
    })
    await getControlDb().delete(authUsers).where(eq(authUsers.id, identity.id))
  })

  test('rejects requests until enabled with a matching token', async () => {
    const token = await scoped(regenerateShottimerToken)
    expect((await postShot(token, { seconds: 27 })).status).toBe(401)

    await scoped(() => setShottimerEnabled(true))
    expect((await postShot(null, { seconds: 27 })).status).toBe(401)
    expect((await postShot('wrong', { seconds: 27 })).status).toBe(401)
    expect((await postShot(token, { seconds: -1 })).status).toBe(400)

    const replacement = await scoped(regenerateShottimerToken)
    expect((await postShot(token, { seconds: 27 })).status).toBe(401)
    expect((await postShot(replacement, { seconds: 27.456 })).status).toBe(204)
  })

  test('offers the latest shot until it is dismissed', async () => {
    const pending = await scoped(loadPendingShottimerShot)
    expect(pending?.seconds).toBe(27.46)
    if (!pending) throw new Error('Expected a pending shot')

    await scoped(() => dismissShottimerShot(pending.receivedAt))
    expect(await scoped(loadPendingShottimerShot)).toBeNull()
  })

  test('serves the reported target time', async () => {
    const token = await scoped(regenerateShottimerToken)
    await scoped(() => setShottimerTarget(28))
    const request = new Request('http://roastbook.test/api/shottimer/target', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const response = await handleJournalRequest(request, () =>
      handleShottimerTargetRequest(request),
    )
    expect(await response.json()).toEqual({ targetSeconds: 28 })
  })
})
