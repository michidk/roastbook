import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { getControlDb } from '@/db/connection.server'
import { type JournalIdentity, withJournal } from '@/db/journal-context.server'
import { withJournalResponse } from '@/db/journal-response.server'
import {
  accountJobs,
  aiProviderCredentials,
  authUsers,
  authVerifications,
  beanImages,
  beanPurchases,
  beans,
  gear,
  gearImages,
  integrationTokens,
} from '@/db/schema'
import { downloadAccountExport } from '@/lib/server/account-export'
import { getStorage } from '@/lib/storage'
import {
  changeUserRole,
  confirmAccountDeletion,
  issueToken,
  listUsers,
  requestAccountExport,
  revokeToken,
} from './account.server'
import { createJournalDefaults } from './defaults.server'
import { runAccountJob } from './jobs.server'
import { journalTables } from './journal-tables.server'
import { handleJournalRequest } from './request.server'

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip
const first: JournalIdentity = {
  id: `account-a-${randomUUID()}`,
  name: 'Private owner',
  email: `a-${randomUUID()}@example.test`,
  role: 'admin',
  authentication: true,
  authenticatedAt: new Date(),
}
const second: JournalIdentity = {
  ...first,
  id: `account-b-${randomUUID()}`,
  email: `b-${randomUUID()}@example.test`,
  role: 'user',
}
const database = getControlDb
const asFirst = <T>(work: () => Promise<T>) => withJournal(first, work)
const asSecond = <T>(work: () => Promise<T>) => withJournal(second, work)
let directory: string | undefined
let imagePath = '',
  gearImagePath = '',
  exportedPath = ''

suite('private account lifecycle', () => {
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'roastbook-lifecycle-'))
    await database()
      .insert(authUsers)
      .values(
        [first, second].map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: true,
          journalInitializedAt: new Date(),
        })),
      )
    await database().transaction((tx) => createJournalDefaults(tx, second.id))
    await database().insert(aiProviderCredentials).values({
      userId: second.id,
      baseURL: 'https://provider.example/v1',
      api: 'responses',
      encryptedApiKey: 'fixture-secret-not-for-export',
      visionModel: 'private-vision',
      researchModel: 'private-reasoning',
    })
    await asSecond(async () => {
      const [bean] = await db
        .insert(beans)
        .values({ name: 'Private export bean' })
        .returning()
      const [device] = await db
        .insert(gear)
        .values({ name: 'Private grinder', type: 'grinder' })
        .returning()
      if (!bean || !device) throw new Error('Missing fixture')
      imagePath = `beans/${bean.id}/${randomUUID()}.webp`
      gearImagePath = `gear/${device.id}/${randomUUID()}.webp`
      await getStorage().upload(new Blob(['Original bean image']), imagePath)
      await getStorage().upload(
        new Blob(['Original gear image']),
        gearImagePath,
      )
      const [purchase] = await db
        .insert(beanPurchases)
        .values({ beanId: bean.id })
        .returning()
      if (!purchase) throw new Error('Missing purchase')
      await db.insert(beanImages).values({
        beanId: bean.id,
        beanPurchaseId: purchase.id,
        storagePath: imagePath,
      })
      await db
        .insert(gearImages)
        .values({ gearId: device.id, storagePath: gearImagePath })
    })
  })
  afterAll(async () => {
    for (const owner of [first, second]) {
      // These accounts and files belong exclusively to this test.
      for (const table of [...journalTables].reverse()) {
        // A rollback handles restrictive FK ordering below through owner deletion.
        await database()
          .execute(
            sql`delete from ${sql.identifier(table)} where owner_id=${owner.id}`,
          )
          .catch(() => undefined)
      }
    }
    await database()
      .delete(integrationTokens)
      .where(inArray(integrationTokens.userId, [first.id, second.id]))
    await database()
      .delete(accountJobs)
      .where(inArray(accountJobs.userId, [first.id, second.id]))
    await database()
      .delete(authUsers)
      .where(inArray(authUsers.id, [first.id, second.id]))
    for (const path of [imagePath, gearImagePath, exportedPath].filter(Boolean))
      await getStorage().delete(path)
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  test('covers every journal table with forced RLS and owner policies', async () => {
    const rows = await database().execute(
      sql`select tablename from pg_tables where schemaname='public' and rowsecurity`,
    )
    expect(rows.map((row) => String(row.tablename)).sort()).toEqual(
      [...journalTables].sort(),
    )
    const forced = await database().execute(
      sql`select relname from pg_class where relrowsecurity and not relforcerowsecurity`,
    )
    expect(forced).toHaveLength(0)
  })
  test('normal users cannot administer accounts and concurrent demotions retain one admin', async () => {
    await expect(asSecond(() => listUsers(0))).rejects.toThrow('Administrator')
    await expect(
      asFirst(() => changeUserRole(first.id, 'user')),
    ).rejects.toThrow('last administrator')
    await asFirst(() => changeUserRole(second.id, 'admin'))
    const anotherAdmin = { ...second, role: 'admin' as const }
    const results = await Promise.allSettled([
      asFirst(() => changeUserRole(first.id, 'user')),
      withJournal(anotherAdmin, () => changeUserRole(second.id, 'user')),
    ])
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    await database()
      .update(authUsers)
      .set({ role: 'admin' })
      .where(eq(authUsers.id, first.id))
    await database()
      .update(authUsers)
      .set({ role: 'user' })
      .where(eq(authUsers.id, second.id))
  })
  test('keeps a streamed database operation in its transaction until the response ends', async () => {
    const response = await withJournalResponse(
      second,
      async () =>
        new Response(
          new ReadableStream({
            async start(controller) {
              await new Promise((resolve) => setTimeout(resolve, 20))
              const result = await db.select({ name: beans.name }).from(beans)
              controller.enqueue(
                new TextEncoder().encode(JSON.stringify(result)),
              )
              controller.close()
            },
          }),
        ),
    )
    expect(await response.text()).toContain('Private export bean')
  })
  test('requires correct token kind, owner, expiry, and revocation for integrations', async () => {
    const token = await asSecond(() => issueToken('mcp', 'Lifecycle test'))
    const request = (path: string, value = token) =>
      new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${value}` },
      })
    const mcp = request('/api/mcp')
    const result = await handleJournalRequest(mcp, async () =>
      Response.json(await db.select({ name: beans.name }).from(beans)),
    )
    expect(await result.json()).toEqual([{ name: 'Private export bean' }])
    expect(
      (
        await handleJournalRequest(
          request('/api/mcp', 'wrong'),
          async () => new Response(),
        )
      ).status,
    ).toBe(401)
    expect(
      (
        await handleJournalRequest(
          request('/api/shottimer/shots'),
          async () => new Response(),
        )
      ).status,
    ).toBe(401)
    const [stored] = await database()
      .select()
      .from(integrationTokens)
      .where(eq(integrationTokens.userId, second.id))
    if (!stored) throw new Error('Missing token')
    await asFirst(() => revokeToken(stored.id))
    expect(
      (await handleJournalRequest(mcp, async () => new Response())).status,
    ).toBe(200)
    await database()
      .update(integrationTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(integrationTokens.id, stored.id))
    expect(
      (await handleJournalRequest(mcp, async () => new Response())).status,
    ).toBe(401)
    await asSecond(() => revokeToken(stored.id))
    expect(
      (await handleJournalRequest(mcp, async () => new Response())).status,
    ).toBe(401)
  })
  test('exports profile, private data, and originals while excluding credentials', async () => {
    await asSecond(requestAccountExport)
    expect(await runAccountJob()).toBe(true)
    const [job] = await database()
      .select()
      .from(accountJobs)
      .where(
        and(eq(accountJobs.userId, second.id), eq(accountJobs.kind, 'export')),
      )
    expect(job?.status).toBe('ready')
    if (!job?.storagePath || !directory)
      throw new Error('Export did not complete')
    exportedPath = job.storagePath
    const response = await asSecond(() => downloadAccountExport(job.id))
    const zip = join(directory, 'export.zip')
    await Bun.write(zip, await response.arrayBuffer())
    const listing = Bun.spawnSync(['unzip', '-Z1', zip])
    expect(listing.exitCode).toBe(0)
    const entries = listing.stdout.toString()
    expect(entries).toContain(`images/${imagePath}`)
    expect(entries).toContain(`images/${gearImagePath}`)
    expect(entries).not.toContain('auth_')
    expect(entries).not.toContain('integration_tokens')
    const provider = Bun.spawnSync([
      'unzip',
      '-p',
      zip,
      'ai-provider.json',
    ]).stdout.toString()
    expect(provider).toContain('private-vision')
    expect(provider).not.toContain('fixture-secret-not-for-export')
    expect(provider).not.toContain('encryptedApiKey')
    const profile = Bun.spawnSync([
      'unzip',
      '-p',
      zip,
      'account.json',
    ]).stdout.toString()
    expect(profile).toContain(second.email)
    expect(profile).not.toContain(first.email)
    expect(
      Bun.spawnSync([
        'unzip',
        '-p',
        zip,
        `images/${imagePath}`,
      ]).stdout.toString(),
    ).toBe('Original bean image')
    expect((await asFirst(() => downloadAccountExport(job.id))).status).toBe(
      404,
    )
    await expect(asSecond(requestAccountExport)).rejects.toThrow(
      'one export per hour',
    )
  })
  test('requires a one-time email confirmation and removes journal, credentials, and files', async () => {
    await asSecond(() => issueToken('mcp', 'Delete test'))
    await database()
      .insert(authVerifications)
      .values({
        id: randomUUID(),
        identifier: `sign-in-otp-${second.email}`,
        value: 'expired-sign-in-code',
        expiresAt: new Date(Date.now() - 60_000),
      })
    const unfinishedExportId = randomUUID()
    const unfinishedExportPath = `account-exports/${second.id}/${unfinishedExportId}.zip`
    await database().insert(accountJobs).values({
      id: unfinishedExportId,
      userId: second.id,
      kind: 'export',
      status: 'failed',
    })
    await getStorage().upload(
      new Blob(['Incomplete archive']),
      unfinishedExportPath,
    )
    const token = randomUUID()
    await database()
      .insert(authVerifications)
      .values({
        id: randomUUID(),
        identifier: `delete:${second.id}`,
        value: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
      })
    await expect(
      asSecond(() => confirmAccountDeletion('wrong')),
    ).rejects.toThrow('invalid or expired')
    await asSecond(() => confirmAccountDeletion(token))
    await expect(
      asSecond(() => confirmAccountDeletion(token)),
    ).rejects.toThrow()
    expect(await runAccountJob()).toBe(true)
    expect(
      await database()
        .select()
        .from(authUsers)
        .where(eq(authUsers.id, second.id)),
    ).toHaveLength(0)
    for (const table of journalTables)
      expect(
        await database().execute(
          sql`select 1 from ${sql.identifier(table)} where owner_id=${second.id}`,
        ),
      ).toHaveLength(0)
    expect(
      await database()
        .select()
        .from(integrationTokens)
        .where(eq(integrationTokens.userId, second.id)),
    ).toHaveLength(0)
    expect(
      await database()
        .select()
        .from(aiProviderCredentials)
        .where(eq(aiProviderCredentials.userId, second.id)),
    ).toHaveLength(0)
    expect(await getStorage().exists(imagePath)).toBe(false)
    expect(await getStorage().exists(gearImagePath)).toBe(false)
    expect(await getStorage().exists(exportedPath)).toBe(false)
    expect(await getStorage().exists(unfinishedExportPath)).toBe(false)
    expect(
      await database()
        .select()
        .from(authVerifications)
        .where(eq(authVerifications.identifier, `sign-in-otp-${second.email}`)),
    ).toHaveLength(0)
  })
})
