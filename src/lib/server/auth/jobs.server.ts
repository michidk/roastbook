import '@tanstack/react-start/server-only'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { ZipArchive } from 'archiver'
import { and, eq, inArray, lt, sql } from 'drizzle-orm'
import { db } from '@/db'
import { getControlDb } from '@/db/connection.server'
import { withJournal } from '@/db/journal-context.server'
import {
  accountJobs,
  authRateLimits,
  authUsers,
  authVerifications,
} from '@/db/schema'
import { getStoredImagePaths } from '@/lib/image-path'
import { getStorage } from '@/lib/storage'
import { readAiProviderCredentials } from '../ai-provider-settings.server'
import { journalTables } from './journal-tables.server'

type Job = typeof accountJobs.$inferSelect
const imageTables = [
  'bean_images',
  'gear_images',
  'coffee_shop_images',
  'brew_images',
  'cafe_visit_images',
] as const

async function exportJournal(job: Job) {
  const directory = await mkdtemp(join(tmpdir(), 'roastbook-export-'))
  const storage = getStorage()
  const key = `account-exports/${job.userId}/${job.id}.zip`
  try {
    const archive = new ZipArchive({ zlib: { level: 6 } })
    const zip = join(directory, 'journal.zip')
    const completed = pipeline(archive, createWriteStream(zip, { mode: 0o600 }))
    // Attach a rejection handler immediately; the awaited promise still reports failures.
    void completed.catch(() => undefined)
    archive.append(
      JSON.stringify(
        {
          format: 'roastbook',
          version: 1,
          exportedAt: new Date().toISOString(),
          userId: job.userId,
          dataFormat: 'JSON Lines',
          images: 'images/<stored path>',
        },
        null,
        2,
      ),
      { name: 'manifest.json' },
    )
    const [profile] = await getControlDb()
      .select({
        id: authUsers.id,
        email: authUsers.email,
        createdAt: authUsers.createdAt,
      })
      .from(authUsers)
      .where(eq(authUsers.id, job.userId))
    archive.append(JSON.stringify(profile, null, 2), { name: 'account.json' })
    const provider = await readAiProviderCredentials()
    if (provider)
      archive.append(
        JSON.stringify(
          {
            baseURL: provider.baseURL,
            api: provider.api,
            visionModel: provider.visionModel,
            researchModel: provider.researchModel,
          },
          null,
          2,
        ),
        { name: 'ai-provider.json' },
      )
    archive.append(
      'Each data/*.jsonl file contains one JSON object per line. Image storage_path fields refer to images/<storage_path>. Authentication credentials and integration secrets are excluded.\n',
      { name: 'README.txt' },
    )
    for (const table of journalTables) {
      if (
        [
          'journal_command_receipts',
          'journal_id_reservations',
          'journal_changes',
          'journal_sync_revisions',
          'media_cleanup_jobs',
          'shottimer',
        ].includes(table)
      )
        continue
      const target = join(directory, `${table}.jsonl`)
      const file = Bun.file(target).writer()
      try {
        for (let offset = 0; ; offset += 250) {
          const rows = await db.execute(
            sql`select to_jsonb(record) - 'owner_id' as data from ${sql.identifier(table)} record limit 250 offset ${offset}`,
          )
          for (const row of rows) file.write(`${JSON.stringify(row.data)}\n`)
          await file.flush()
          if (rows.length < 250) break
        }
      } finally {
        await file.end()
      }
      archive.file(target, { name: `data/${table}.jsonl` })
    }
    for (const table of imageTables) {
      const rows = await db.execute(
        sql`select storage_path from ${sql.identifier(table)}`,
      )
      for (const row of rows) {
        const path = String(row.storage_path)
        // Historical filenames never control archive paths outside the images directory.
        if (path.startsWith('/') || path.split('/').includes('..'))
          throw new Error('Invalid stored image path')
        const stream = await storage.downloadStream(path)
        const entryName = `images/${path}`
        const entry = new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            archive.off('entry', onEntry)
            archive.off('error', onError)
            stream.off('error', onError)
          }
          const onError = (error: Error) => {
            cleanup()
            reject(error)
          }
          const onEntry = (entry: { name: string }) => {
            if (entry.name === entryName) {
              cleanup()
              resolve()
            }
          }
          archive.on('entry', onEntry)
          stream.once('error', onError)
          archive.once('error', onError)
        })
        archive.append(stream, { name: `images/${path}` })
        await entry
      }
    }
    await archive.finalize()
    await completed
    await storage.uploadStream(createReadStream(zip), key)
    await getControlDb()
      .update(accountJobs)
      .set({
        status: 'ready',
        storagePath: key,
        expiresAt: new Date(Date.now() + 86400_000),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(accountJobs.id, job.id),
          eq(accountJobs.attempts, job.attempts),
          eq(accountJobs.status, 'running'),
        ),
      )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function deleteJournal(job: Job) {
  const storage = getStorage()
  for (const table of imageTables) {
    const rows = await db.execute(
      sql`select storage_path from ${sql.identifier(table)}`,
    )
    for (const row of rows)
      for (const path of getStoredImagePaths([String(row.storage_path)]))
        await storage.delete(path)
  }
  const pending = await db.execute(
    sql`select storage_path from media_cleanup_jobs`,
  )
  for (const row of pending) await storage.delete(String(row.storage_path))
  const exports = await getControlDb()
    .select()
    .from(accountJobs)
    .where(
      and(eq(accountJobs.userId, job.userId), eq(accountJobs.kind, 'export')),
    )
  for (const entry of exports)
    await storage.delete(
      entry.storagePath ?? `account-exports/${job.userId}/${entry.id}.zip`,
    )
  // Remove dependents first, including restrictive foreign keys and gear subtypes.
  const order = [
    'journal_command_receipts',
    'journal_id_reservations',
    'brew_drink_options',
    'brew_taste_tags',
    'brew_accessory_gear',
    'brew_images',
    'recipe_drink_options',
    'recipe_accessory_gear',
    'cafe_visit_drink_options',
    'cafe_visit_taste_tags',
    'cafe_visit_images',
    'brews',
    'recipes',
    'cafe_visits',
    'gear_set_accessory_gear',
    'gear_sets',
    'bean_images',
    'bean_purchases',
    'beans',
    'coffee_shop_images',
    'coffee_shops',
    'roasters',
    'espresso_machine_setting_revisions',
    'espresso_machine_details',
    'grinder_details',
    'brewer_details',
    'kettle_details',
    'scale_details',
    'tamper_details',
    'wdt_details',
    'basket_details',
    'gear_property_evidence',
    'gear_images',
    'gear',
    'brewing_method_drink_types',
    'drink_type_option_groups',
    'drink_option_values',
    'drink_option_groups',
    'brewing_methods',
    'drink_types',
    'taste_tags',
    'settings',
    'shottimer',
    'mcp_settings',
    'mcp_audit_events',
    'ai_request_logs',
    'media_cleanup_jobs',
    'journal_sync_revisions',
    // Last: deleting journal rows above records their changes here.
    'journal_changes',
  ]
  for (const table of order)
    await db.execute(sql`delete from ${sql.identifier(table)}`)
}

export async function runAccountJob(): Promise<boolean> {
  const database = getControlDb()
  const job = await database.transaction(async (tx) => {
    const [candidate] = await tx
      .select()
      .from(accountJobs)
      .where(
        and(
          inArray(accountJobs.status, ['pending', 'running']),
          lt(accountJobs.availableAt, new Date()),
        ),
      )
      .orderBy(accountJobs.availableAt)
      .for('update', { skipLocked: true })
      .limit(1)
    if (!candidate) return null
    const [claimed] = await tx
      .update(accountJobs)
      .set({
        status: 'running',
        attempts: sql`${accountJobs.attempts}+1`,
        availableAt: new Date(Date.now() + 120_000),
        updatedAt: new Date(),
      })
      .where(eq(accountJobs.id, candidate.id))
      .returning()
    return claimed ?? null
  })
  if (!job) return false
  const heartbeat = setInterval(() => {
    void database
      .update(accountJobs)
      .set({ availableAt: new Date(Date.now() + 120_000) })
      .where(
        and(
          eq(accountJobs.id, job.id),
          eq(accountJobs.attempts, job.attempts),
          eq(accountJobs.status, 'running'),
        ),
      )
      .catch(() => undefined)
  }, 30_000)
  try {
    const [user] = await database
      .select()
      .from(authUsers)
      .where(eq(authUsers.id, job.userId))
    if (!user) throw new Error('Account is unavailable')
    if (job.kind === 'export' && user.deletingAt) {
      await database.delete(accountJobs).where(eq(accountJobs.id, job.id))
      return true
    }
    let processed = false
    await withJournal(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        authentication: true,
        authenticatedAt: null,
      },
      async () => {
        const [current] = await database
          .select()
          .from(accountJobs)
          .where(eq(accountJobs.id, job.id))
        if (current?.status !== 'running' || current.attempts !== job.attempts)
          return
        if (job.kind === 'export') await exportJournal(job)
        else await deleteJournal(job)
        processed = true
      },
      { allowDeleting: job.kind === 'delete' },
    )
    if (job.kind === 'delete' && processed)
      await database.transaction(async (tx) => {
        await tx
          .delete(authVerifications)
          .where(
            inArray(authVerifications.identifier, [
              `delete:${user.id}`,
              `sign-in-otp-${user.email}`,
            ]),
          )
        await tx.delete(accountJobs).where(eq(accountJobs.userId, job.userId))
        await tx.delete(authUsers).where(eq(authUsers.id, job.userId))
      })
  } catch (error) {
    console.error('[Roastbook] Account job failed', {
      jobId: job.id,
      kind: job.kind,
      attempt: job.attempts,
      error: error instanceof Error ? error.message : 'Unknown failure',
    })
    await database
      .update(accountJobs)
      .set({
        status:
          job.kind === 'export' && job.attempts >= 4 ? 'failed' : 'pending',
        availableAt: new Date(
          Date.now() +
            Math.min(3600_000, 60_000 * 2 ** Math.min(job.attempts, 6)),
        ),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(accountJobs.id, job.id),
          eq(accountJobs.attempts, job.attempts),
          eq(accountJobs.status, 'running'),
        ),
      )
  } finally {
    clearInterval(heartbeat)
  }
  return true
}

export async function expireAccountExports() {
  const database = getControlDb()
  await database
    .delete(authRateLimits)
    .where(lt(authRateLimits.lastRequest, Date.now() - 86400_000))
  const entries = await database
    .select()
    .from(accountJobs)
    .where(
      and(
        eq(accountJobs.kind, 'export'),
        eq(accountJobs.status, 'ready'),
        lt(accountJobs.expiresAt, new Date()),
      ),
    )
    .limit(25)
  for (const job of entries) {
    if (job.storagePath) await getStorage().delete(job.storagePath)
    await database.delete(accountJobs).where(eq(accountJobs.id, job.id))
  }
}
