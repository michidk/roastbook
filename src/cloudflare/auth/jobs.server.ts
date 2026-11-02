import '@tanstack/react-start/server-only'
import { getTableColumns, getTableName, is, sql, Table } from 'drizzle-orm'
import { z } from 'zod'
import * as schema from '@/db/d1/schema'
import { getStoredImagePaths } from '@/lib/image-path'
import { journalTables } from '@/lib/server/auth/journal-tables.server'
import { validateObjectKey } from '@/lib/storage/r2'
import { requireCloudflareRuntime } from '../context.server'
import {
  type ArchiveEntry,
  createExportArchive,
} from '../export-archive.server'
import { uploadArchive } from '../storage.server'
import { assertControlCondition, runControlBatch } from './control-batch.server'

const jobRow = z.object({
  id: z.string(),
  user_id: z.string(),
  kind: z.enum(['export', 'delete']),
  attempts: z.number().int().positive(),
  available_at: z.number(),
})
type Job = z.infer<typeof jobRow>
const imageTables = [
  'bean_images',
  'gear_images',
  'coffee_shop_images',
  'brew_images',
  'cafe_visit_images',
] as const
const excludedExports = new Set([
  'client_operations',
  'media_cleanup_jobs',
  'replication_changes',
  'shottimer',
])
const exportedTables = journalTables.filter(
  (table) => !excludedExports.has(table),
)
const deleteOrder = [
  'client_operations',
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
  'replication_changes',
  'ai_request_logs',
  'ai_usage',
  'media_cleanup_jobs',
] as const satisfies readonly (typeof journalTables)[number][]
const tableColumns = new Map(
  Object.values(schema)
    .filter((value) => is(value, Table))
    .map((table) => [
      getTableName(table),
      Object.values(getTableColumns(table)),
    ]),
)
const leaseMs = 120_000
const maxExportMs = 90_000
const maxExportBytes = 64 * 1024 * 1024
const maxExportRows = 5_000
const maxExportImages = 200
class LostClaim extends Error {}
class ExportLimit extends Error {}
function database() {
  return requireCloudflareRuntime().bindings.DB
}
function bucket() {
  return requireCloudflareRuntime().bindings.MEDIA
}
function claimCondition(job: Job) {
  return sql`exists(select 1 from account_jobs where id=${job.id} and user_id=${job.user_id} and attempts=${job.attempts} and status='running' and available_at>${Date.now()})`
}
async function renew(job: Job) {
  const result = await database()
    .prepare(
      "update account_jobs set available_at=?,updated_at=? where id=? and user_id=? and attempts=? and status='running' and available_at>? and exists(select 1 from auth_users where id=? and ((?='delete' and deleting_at is not null) or (?='export' and deleting_at is null)))",
    )
    .bind(
      Date.now() + leaseMs,
      Date.now(),
      job.id,
      job.user_id,
      job.attempts,
      Date.now(),
      job.user_id,
      job.kind,
      job.kind,
    )
    .run()
  if (result.meta.changes !== 1)
    throw new LostClaim('Job claim or account is no longer available')
}
function archivePrefix(job: Pick<Job, 'user_id' | 'id'>) {
  return `${validateObjectKey(`account-exports/${job.user_id}/${job.id}`)}/`
}
async function clearArchivePrefix(prefix: string, maxPages = 10) {
  for (let page = 0; page < maxPages; page++) {
    const listing = await bucket().list({ prefix, limit: 1000 })
    if (!listing.objects.length) return true
    await bucket().delete(listing.objects.map((object) => object.key))
  }
  return false
}
function decodedRow(
  table: (typeof journalTables)[number],
  row: Record<string, unknown>,
) {
  const columns = tableColumns.get(table)
  if (!columns) throw new Error('Unknown export table')
  return Object.fromEntries(
    columns
      .filter((column) => column.name !== 'owner_id')
      .map((column) => {
        const value = row[column.name]
        return [
          column.name,
          value === null ? null : column.mapFromDriverValue(value),
        ]
      }),
  )
}
function rowsStream(rows: AsyncGenerator<Uint8Array>) {
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          const row = await rows.next()
          if (row.done) controller.close()
          else controller.enqueue(row.value)
        } catch (error) {
          controller.error(error)
        }
      },
      async cancel() {
        await rows.return(undefined)
      },
    },
    { highWaterMark: 0 },
  )
}
function imageBody(reader: {
  read(): Promise<{ done: boolean; value?: unknown }>
  cancel(): Promise<void>
  releaseLock(): void
}) {
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          const chunk = await reader.read()
          if (chunk.done) {
            controller.close()
            reader.releaseLock()
          } else if (chunk.value instanceof Uint8Array)
            controller.enqueue(chunk.value)
          else throw new Error('Invalid image stream')
        } catch (error) {
          controller.error(error)
        }
      },
      async cancel() {
        await reader.cancel()
        reader.releaseLock()
      },
    },
    { highWaterMark: 0 },
  )
}
async function exportJournal(job: Job) {
  const startedAt = Date.now()
  let bytes = 0
  let rows = 0
  let images = 0
  const encoder = new TextEncoder()
  const guard = async () => {
    if (Date.now() - startedAt > maxExportMs)
      throw new ExportLimit('Export exceeds execution time limit')
    await renew(job)
  }
  function countBytes(size: number) {
    bytes += size
    if (bytes > maxExportBytes)
      throw new ExportLimit('Export exceeds 64 MiB limit')
  }
  async function* entries(): AsyncGenerator<ArchiveEntry> {
    yield {
      name: 'manifest.json',
      body: JSON.stringify({
        format: 'roastbook',
        version: 1,
        exportedAt: new Date().toISOString(),
        userId: job.user_id,
        dataFormat: 'JSON Lines',
        images: 'images/<stored path>',
      }),
    }
    const profile = await database()
      .prepare(
        'select id,email,created_at from auth_users where id=? and deleting_at is null',
      )
      .bind(job.user_id)
      .first<{ id: string; email: string; created_at: number }>()
    if (!profile) throw new LostClaim('Account is unavailable')
    yield {
      name: 'account.json',
      body: JSON.stringify({
        id: profile.id,
        email: profile.email,
        createdAt: new Date(profile.created_at).toISOString(),
      }),
    }
    const provider = await database()
      .prepare(
        'select base_url as baseURL,api,vision_model as visionModel,research_model as researchModel from ai_provider_credentials where user_id=?',
      )
      .bind(job.user_id)
      .first()
    if (provider)
      yield { name: 'ai-provider.json', body: JSON.stringify(provider) }
    yield {
      name: 'README.txt',
      body: 'Each data/*.jsonl file contains one JSON object per line. Image storage_path fields refer to images/<storage_path>. Authentication credentials and integration secrets are excluded.\n',
    }
    for (const table of exportedTables) {
      async function* lines() {
        let cursor = 0
        while (true) {
          await guard()
          const page = await database()
            .prepare(
              `select rowid as __cursor,* from "${table}" where owner_id=? and rowid>? order by rowid limit 25`,
            )
            .bind(job.user_id, cursor)
            .all<Record<string, unknown>>()
          for (const row of page.results) {
            cursor = z.number().int().parse(row.__cursor)
            if (++rows > maxExportRows)
              throw new ExportLimit('Export exceeds 5000 rows')
            const encoded = encoder.encode(
              `${JSON.stringify(decodedRow(table, row))}\n`,
            )
            countBytes(encoded.length)
            yield encoded
          }
          if (page.results.length < 25) return
        }
      }
      yield { name: `data/${table}.jsonl`, body: rowsStream(lines()) }
    }
    for (const table of imageTables) {
      let cursor = 0
      while (true) {
        await guard()
        const page = await database()
          .prepare(
            `select rowid as cursor,storage_path from "${table}" where owner_id=? and rowid>? order by rowid limit 100`,
          )
          .bind(job.user_id, cursor)
          .all<{ cursor: number; storage_path: string }>()
        for (const row of page.results) {
          cursor = row.cursor
          if (++images > maxExportImages)
            throw new ExportLimit('Export exceeds 200 images')
          const path = validateObjectKey(row.storage_path)
          const object = await bucket().get(path)
          if (!object) throw new Error('An exported image is unavailable')
          countBytes(object.size)
          yield {
            name: `images/${path}`,
            body: imageBody(object.body.getReader()),
          }
          await guard()
        }
        if (page.results.length < 100) break
      }
    }
  }
  const path = `${archivePrefix(job)}${job.attempts}.zip`
  let published = false
  try {
    await guard()
    if (!(await clearArchivePrefix(archivePrefix(job))))
      throw new Error('Archive cleanup requires another attempt')
    await uploadArchive(path, createExportArchive({ entries: entries() }))
    await guard()
    const result = await database()
      .prepare(
        "update account_jobs set status='ready',storage_path=?,expires_at=?,updated_at=? where id=? and user_id=? and attempts=? and status='running' and available_at>? and exists(select 1 from auth_users where id=? and deleting_at is null)",
      )
      .bind(
        path,
        Date.now() + 86_400_000,
        Date.now(),
        job.id,
        job.user_id,
        job.attempts,
        Date.now(),
        job.user_id,
      )
      .run()
    published = result.meta.changes === 1
    if (!published) throw new LostClaim('Export claim is no longer current')
  } finally {
    if (!published) await bucket().delete(path)
  }
}
async function deleteJournal(job: Job) {
  const startedAt = Date.now()
  let pages = 0
  for (const table of [...imageTables, 'media_cleanup_jobs'] as const) {
    while (true) {
      await renew(job)
      const page = await database()
        .prepare(
          `select rowid as cursor,storage_path from "${table}" where owner_id=? order by rowid limit 100`,
        )
        .bind(job.user_id)
        .all<{ cursor: number; storage_path: string }>()
      if (!page.results.length) break
      for (const row of page.results) {
        await renew(job)
        const paths =
          table === 'media_cleanup_jobs'
            ? [row.storage_path]
            : getStoredImagePaths([row.storage_path])
        await bucket().delete(paths.map(validateObjectKey))
        await runControlBatch(
          [
            ...assertControlCondition(claimCondition(job)),
            sql`delete from ${sql.identifier(table)} where owner_id=${job.user_id} and rowid=${row.cursor}`,
          ],
          'Job claim is no longer current',
        )
      }
      if (++pages >= 1 || Date.now() - startedAt > 15_000) return false
    }
  }
  await renew(job)
  if (
    !(await clearArchivePrefix(
      `${validateObjectKey(`account-exports/${job.user_id}`)}/`,
    ))
  )
    return false
  // Favicons are deterministically named; remove them while owner records still exist.
  for (const [table, kind] of [
    ['coffee_shops', 'coffee-shops'],
    ['roasters', 'roasters'],
  ] as const) {
    const page = await database()
      .prepare(
        `select id from "${table}" where owner_id=? order by id limit 100`,
      )
      .bind(job.user_id)
      .all<{ id: number }>()
    for (const row of page.results)
      await bucket().delete(`favicons/${kind}/${row.id}.png`)
  }
  for (const table of deleteOrder) {
    const limit = table === 'coffee_shops' || table === 'roasters' ? 100 : 250
    await renew(job)
    const result = await database()
      .prepare(
        `delete from "${table}" where owner_id=? and rowid in (select rowid from "${table}" where owner_id=? limit ${limit}) and exists(select 1 from account_jobs where id=? and attempts=? and status='running' and available_at>?)`,
      )
      .bind(job.user_id, job.user_id, job.id, job.attempts, Date.now())
      .run()
    if (
      result.meta.changes >= limit ||
      ++pages >= 80 ||
      Date.now() - startedAt > 15_000
    )
      return false
  }
  await renew(job)
  const profile = await database()
    .prepare(
      'select email from auth_users where id=? and deleting_at is not null',
    )
    .bind(job.user_id)
    .first<{ email: string }>()
  if (!profile) throw new LostClaim('Deleting account is unavailable')
  await runControlBatch(
    [
      ...assertControlCondition(claimCondition(job)),
      sql`delete from auth_verifications where identifier in (${`delete:${job.user_id}`},${`sign-in-otp-${profile.email}`})`,
      sql`delete from account_jobs where user_id=${job.user_id}`,
      sql`delete from auth_users where id=${job.user_id} and deleting_at is not null`,
    ],
    'Job claim is no longer current',
  )
  return true
}
export async function runAccountJob(): Promise<boolean> {
  const claimed = await database()
    .prepare(
      "update account_jobs set status='running',attempts=attempts+1,available_at=?,updated_at=? where id=(select id from account_jobs where status in ('pending','running') and available_at<=? order by available_at,id limit 1) and status in ('pending','running') and available_at<=? returning *",
    )
    .bind(Date.now() + leaseMs, Date.now(), Date.now(), Date.now())
    .first()
  if (!claimed) return false
  const job = jobRow.parse(claimed)
  try {
    const profile = await database()
      .prepare('select deleting_at from auth_users where id=?')
      .bind(job.user_id)
      .first<{ deleting_at: number | null }>()
    if (!profile || (job.kind === 'export' && profile.deleting_at !== null)) {
      await database()
        .prepare(
          "delete from account_jobs where id=? and attempts=? and status='running'",
        )
        .bind(job.id, job.attempts)
        .run()
      return true
    }
    if (job.kind === 'export') await exportJournal(job)
    else if (!(await deleteJournal(job)))
      await database()
        .prepare(
          "update account_jobs set status='pending',available_at=?,updated_at=? where id=? and attempts=? and status='running'",
        )
        .bind(Date.now(), Date.now(), job.id, job.attempts)
        .run()
  } catch (error) {
    const terminal =
      job.kind === 'export' &&
      (error instanceof ExportLimit || job.attempts >= 4)
    if (!(error instanceof LostClaim)) {
      console.error(
        JSON.stringify({
          event: 'account_job_failed',
          jobId: job.id,
          kind: job.kind,
          attempt: job.attempts,
          terminal,
        }),
      )
      await database()
        .prepare(
          "update account_jobs set status=?,available_at=?,expires_at=?,updated_at=? where id=? and attempts=? and status='running' and available_at>?",
        )
        .bind(
          terminal ? 'failed' : 'pending',
          Date.now() +
            Math.min(3_600_000, 60_000 * 2 ** Math.min(job.attempts, 6)),
          terminal ? Date.now() + 86_400_000 : null,
          Date.now(),
          job.id,
          job.attempts,
          Date.now(),
        )
        .run()
    }
  }
  return true
}
export async function expireAccountExports() {
  await database()
    .prepare(
      'delete from auth_verifications where id in (select id from auth_verifications where expires_at<? limit 250)',
    )
    .bind(Date.now() - 86_400_000)
    .run()
  await database()
    .prepare(
      'delete from auth_rate_limits where id in (select id from auth_rate_limits where last_request<? limit 250)',
    )
    .bind(Date.now() - 86_400_000)
    .run()
  const jobs = await database()
    .prepare(
      "select id,user_id from account_jobs where kind='export' and status in ('ready','failed') and expires_at<? limit 25",
    )
    .bind(Date.now())
    .all<{ id: string; user_id: string }>()
  for (const job of jobs.results) {
    if (!(await clearArchivePrefix(archivePrefix(job)))) continue
    await database()
      .prepare(
        "delete from account_jobs where id=? and user_id=? and kind='export' and status in ('ready','failed') and expires_at<?",
      )
      .bind(job.id, job.user_id, Date.now())
      .run()
  }
}
