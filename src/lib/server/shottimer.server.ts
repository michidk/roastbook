import { journalInsertValues, owned } from '@/db/journal-scope.server'
import '@tanstack/react-start/server-only'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { shottimer as shottimerTable } from '@/db/schema'
import type { ShottimerSettings, ShottimerShot } from '@/lib/shottimer'

// A shot this old is assumed to belong to an earlier brew, not the one being logged.
const PENDING_SHOT_MAX_AGE_MS = 15 * 60 * 1000

type ShottimerPatch = Partial<
  Omit<typeof shottimerTable.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>
>

async function readShottimer() {
  return db.query.shottimer.findFirst({
    where: owned(shottimerTable, eq(shottimerTable.id, 1)),
  })
}

async function updateShottimer(patch: ShottimerPatch) {
  const [row] = await db
    .insert(shottimerTable)
    .values(journalInsertValues({ id: 1, ...patch }))
    .onConflictDoUpdate({
      target: [shottimerTable.ownerId, shottimerTable.id],
      set: { ...patch, updatedAt: new Date() },
    })
    .returning()
  if (!row) throw new Error('Could not save the shottimer settings')
  return row
}

function toSettings(
  row: typeof shottimerTable.$inferSelect | undefined,
): ShottimerSettings {
  return { enabled: row?.enabled ?? false }
}

export async function loadShottimerSettings() {
  return toSettings(await readShottimer())
}

export async function setShottimerEnabled(enabled: boolean) {
  return toSettings(await updateShottimer({ enabled }))
}

/** The device API answers only while the owner has the integration on. */
export class ShottimerDisabledError extends Error {
  constructor() {
    super('Turn on the shottimer in Settings → Shottimer first')
    this.name = 'ShottimerDisabledError'
  }
}

async function requireShottimerEnabled() {
  if ((await readShottimer())?.enabled !== true)
    throw new ShottimerDisabledError()
}

export async function recordShottimerShot(seconds: number) {
  await requireShottimerEnabled()
  await updateShottimer({
    latestShotSeconds: seconds,
    latestShotAt: new Date(),
  })
}

export async function loadPendingShottimerShot(): Promise<ShottimerShot | null> {
  const row = await readShottimer()
  if (!row?.enabled || row.latestShotSeconds === null || !row.latestShotAt)
    return null
  if (Date.now() - row.latestShotAt.getTime() > PENDING_SHOT_MAX_AGE_MS)
    return null
  return {
    seconds: row.latestShotSeconds,
    receivedAt: row.latestShotAt.toISOString(),
  }
}

/** Clears the pending shot unless a newer one arrived in the meantime. */
export async function dismissShottimerShot(receivedAt: string) {
  await db
    .update(shottimerTable)
    .set({ latestShotSeconds: null, latestShotAt: null })
    .where(
      owned(
        shottimerTable,
        and(
          eq(shottimerTable.id, 1),
          eq(shottimerTable.latestShotAt, new Date(receivedAt)),
        ),
      ),
    )
}

export async function setShottimerTarget(targetTimeSeconds: number | null) {
  const row = await readShottimer()
  if (!row?.enabled) return
  await updateShottimer({ targetTimeSeconds })
}

export async function loadShottimerTarget() {
  await requireShottimerEnabled()
  return (await readShottimer())?.targetTimeSeconds ?? null
}
