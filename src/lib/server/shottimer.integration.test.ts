import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { getControlDb } from '@/db/connection.server'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { authRateLimits, authUsers, shottimer } from '@/db/schema'
import {
  createIntegrationCredential,
  listIntegrationCredentials,
  revokeIntegrationCredential,
} from '@/lib/server/auth/integrations.server'
import { handleJournalRequest } from '@/lib/server/auth/request.server'
import { handleApiRequest } from '@/lib/server/integrations/api.server'
import {
  dismissShottimerShot,
  loadPendingShottimerShot,
  setShottimerEnabled,
  setShottimerTarget,
} from '@/lib/server/shottimer.server'

const integrationDescribe = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip

function postShot(token: string | null, body: unknown) {
  const request = new Request('http://roastbook.test/api/v1/shottimer/shots', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  return handleJournalRequest(request, () => handleApiRequest(request))
}

integrationDescribe('shottimer through the API', () => {
  const identity: JournalIdentity = {
    id: `device-${crypto.randomUUID()}`,
    email: 'device@example.test',
    role: 'user',
    authentication: false,
    authenticatedAt: null,
  }
  const scoped = <T>(work: () => Promise<T>) => withJournal(identity, work)
  const createKey = (scopes: string[]) =>
    scoped(() =>
      createIntegrationCredential({
        kind: 'api',
        name: 'Shottimer',
        scopes,
        expiresAt: null,
      }),
    )
  beforeAll(async () => {
    await getControlDb()
      .insert(authUsers)
      .values({
        id: identity.id,
        email: `${identity.id}@example.test`,
      })
  })
  afterAll(async () => {
    await scoped(async () => {
      await db.delete(shottimer)
    })
    await getControlDb()
      .delete(authRateLimits)
      .where(
        inArray(authRateLimits.key, [
          `integration:user:${identity.id}:minute`,
          `integration:user:${identity.id}:day`,
        ]),
      )
    await getControlDb().delete(authUsers).where(eq(authUsers.id, identity.id))
  })

  test('accepts API keys with the shottimer scope once enabled', async () => {
    const token = await createKey(['shottimer:write'])
    // Turned off in Settings → Shottimer.
    expect((await postShot(token, { seconds: 27 })).status).toBe(422)

    await scoped(() => setShottimerEnabled(true))
    expect((await postShot(null, { seconds: 27 })).status).toBe(401)
    expect((await postShot('wrong', { seconds: 27 })).status).toBe(401)
    expect((await postShot(token, { seconds: -1 })).status).toBe(400)

    // Other permissions do not reach the device API.
    const brews = await createKey(['brews:write'])
    expect((await postShot(brews, { seconds: 27 })).status).toBe(403)

    const [key] = (
      await scoped(() => listIntegrationCredentials('api'))
    ).filter((item) => item.scopes.includes('brews:write'))
    if (key) await scoped(() => revokeIntegrationCredential(key.id))
    expect((await postShot(brews, { seconds: 27 })).status).toBe(401)
    expect((await postShot(token, { seconds: 27.456 })).status).toBe(200)
  })

  test('offers the latest shot until it is dismissed', async () => {
    const pending = await scoped(loadPendingShottimerShot)
    expect(pending?.seconds).toBe(27.46)
    if (!pending) throw new Error('Expected a pending shot')

    await scoped(() => dismissShottimerShot(pending.receivedAt))
    expect(await scoped(loadPendingShottimerShot)).toBeNull()
  })

  test('serves the reported target time', async () => {
    const token = await createKey(['shottimer:read'])
    await scoped(() => setShottimerTarget(28))
    const request = new Request(
      'http://roastbook.test/api/v1/shottimer/target',
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const response = await handleJournalRequest(request, () =>
      handleApiRequest(request),
    )
    expect(await response.json()).toEqual({ data: { targetSeconds: 28 } })
  })
})
