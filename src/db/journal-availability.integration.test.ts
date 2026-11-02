import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq, inArray, sql } from 'drizzle-orm'
import { getControlDb } from './connection.server'
import { db } from './index'
import { type JournalIdentity, withJournal } from './journal-context.server'
import { withJournalResponse } from './journal-response.server'
import { authUsers, beans } from './schema'

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip
const users: JournalIdentity[] = ['busy', 'other'].map((name) => ({
  id: `availability-${name}-${randomUUID()}`,
  email: `${randomUUID()}@example.test`,
  role: 'user',
  authentication: true,
  authenticatedAt: new Date(),
}))
const [busy, other] = users
function required(value: JournalIdentity | undefined) {
  if (!value) throw new Error('Missing account fixture')
  return value
}
suite('journal availability', () => {
  beforeAll(async () => {
    await getControlDb()
      .insert(authUsers)
      .values(
        users.map((user) => ({
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
      .where(
        inArray(
          authUsers.id,
          users.map((user) => user.id),
        ),
      )
  })
  test('keeps another account and authentication available during a stalled response and a same-account burst', async () => {
    const response = await withJournalResponse(
      required(busy),
      async () => new Response('unread response'),
    )
    const burst = Array.from({ length: 20 }, () =>
      withJournal(required(busy), async () => 'queued'),
    )
    const settled = Promise.allSettled(burst)
    let deadline: ReturnType<typeof setTimeout> | undefined
    try {
      await new Promise((resolve) => setTimeout(resolve, 50))
      const outcome = await Promise.race([
        Promise.all([
          withJournal(required(other), async () => 'other journal'),
          getControlDb().select({ id: authUsers.id }).from(authUsers).limit(1),
        ]).then(() => 'available'),
        new Promise<string>((resolve) => {
          deadline = setTimeout(() => resolve('blocked'), 1000)
        }),
      ])
      expect(outcome).toBe('available')
    } finally {
      clearTimeout(deadline)
      await response.body?.cancel()
      await settled
    }
  })
  test('bounds a lock held by another process without occupying waiting connections', async () => {
    const owner = required(busy)
    await getControlDb().transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${owner.id}, 0))`,
      )
      let called = false
      const response = await withJournalResponse(owner, async () => {
        called = true
        return Response.json({ ok: true })
      })
      expect(response.status).toBe(429)
      expect(response.headers.get('retry-after')).toBe('1')
      expect(called).toBe(false)
      expect(await withJournal(required(other), async () => 'available')).toBe(
        'available',
      )
    })
  }, 8_000)
  test('removes an aborted queued request before starting its handler', async () => {
    const response = await withJournalResponse(
      required(busy),
      async () => new Response('unread'),
    )
    const cancellation = new AbortController()
    let called = false
    const waiting = withJournalResponse(
      required(busy),
      async () => {
        called = true
        return Response.json({ ok: true })
      },
      { signal: cancellation.signal },
    )
    try {
      cancellation.abort()
      expect((await waiting).status).toBe(408)
      expect(called).toBe(false)
    } finally {
      await response.body?.cancel()
    }
  })
  test('rolls back a cancelled stream and releases its account for the next request', async () => {
    const cancellation = new AbortController()
    const inserted = Promise.withResolvers<void>()
    const name = `cancelled-${randomUUID()}`
    const response = await withJournalResponse(
      required(busy),
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            async start(controller) {
              try {
                await db.insert(beans).values({ name })
                controller.enqueue(new TextEncoder().encode('pending mutation'))
                inserted.resolve()
              } catch (error) {
                inserted.reject(error)
                controller.error(error)
              }
            },
          }),
        ),
      { signal: cancellation.signal },
    )
    await inserted.promise
    cancellation.abort(new Error('Cancelled stream fixture'))
    await expect(response.text()).rejects.toThrow('Cancelled stream fixture')
    const rows = await withJournal(required(busy), () =>
      db.select().from(beans).where(eq(beans.name, name)),
    )
    expect(rows).toHaveLength(0)
  })
  test('retries another replica lock after releasing its connection', async () => {
    const owner = required(busy)
    let waiting: Promise<Response> | undefined
    await getControlDb().transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${owner.id}, 0))`,
      )
      waiting = withJournalResponse(owner, async () =>
        Response.json({ ok: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(await withJournal(required(other), async () => 'available')).toBe(
        'available',
      )
    })
    expect((await waiting)?.status).toBe(200)
  })
  test('aborts late handler database access after the transaction has rolled back', async () => {
    const cancellation = new AbortController()
    const entered = Promise.withResolvers<void>()
    const resume = Promise.withResolvers<void>()
    const late = Promise.withResolvers<void>()
    const name = `late-${randomUUID()}`
    const request = withJournalResponse(
      required(busy),
      async () => {
        entered.resolve()
        await resume.promise
        try {
          await db.insert(beans).values({ name })
          late.resolve()
        } catch (error) {
          late.reject(error)
        }
        return Response.json({ ok: true })
      },
      { signal: cancellation.signal },
    )
    await entered.promise
    cancellation.abort(new Error('Cancelled handler fixture'))
    expect((await request).status).toBe(408)
    resume.resolve()
    await expect(late.promise).rejects.toThrow('Cancelled handler fixture')
    expect(
      await withJournal(required(busy), () =>
        db.select().from(beans).where(eq(beans.name, name)),
      ),
    ).toHaveLength(0)
  })
  test('expires a stalled stream reader and releases the journal', async () => {
    const cancelled = Promise.withResolvers<void>()
    const response = await withJournalResponse(
      required(busy),
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('unread'))
            },
            cancel() {
              cancelled.resolve()
            },
          }),
        ),
    )
    await cancelled.promise
    await expect(response.text()).rejects.toThrow('reader timed out')
    expect(await withJournal(required(busy), async () => 'available')).toBe(
      'available',
    )
  }, 20_000)
})
