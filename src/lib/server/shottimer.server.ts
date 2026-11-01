import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { getJournalContext } from '@/db/journal-context.server'
import { shottimer as shottimerTable } from '@/db/schema'
import { createIntegrationToken } from '@/lib/server/auth/integrations.server'
import type { ShottimerSettings, ShottimerShot } from '@/lib/shottimer'

// A shot this old is assumed to belong to an earlier brew, not the one being logged.
const PENDING_SHOT_MAX_AGE_MS = 15 * 60 * 1000

type ShottimerPatch = Partial<
  Omit<typeof shottimerTable.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>
>

function hashToken(token: string) {
  return createHash('sha256').update(token).digest()
}

async function readShottimer() {
  return db.query.shottimer.findFirst({ where: eq(shottimerTable.id, 1) })
}

async function updateShottimer(patch: ShottimerPatch) {
  const [row] = await db
    .insert(shottimerTable)
    .values({ id: 1, ...patch })
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
  return { enabled: row?.enabled ?? false, hasToken: Boolean(row?.tokenHash) }
}

export async function loadShottimerSettings() {
  return toSettings(await readShottimer())
}

export async function setShottimerEnabled(enabled: boolean) {
  return toSettings(await updateShottimer({ enabled }))
}

/** Replaces the device token. The plain token is returned once and never stored. */
export async function regenerateShottimerToken() {
  const token = await createIntegrationToken('shottimer', 'Shottimer')
  await updateShottimer({ tokenHash: hashToken(token).toString('hex') })
  return token
}

/** Checks a device request's `Authorization: Bearer <token>` header. */
export async function isAuthorizedShottimerRequest(_request: Request) {
  return (
    Boolean(getJournalContext()) && (await readShottimer())?.enabled === true
  )
}

export async function recordShottimerShot(seconds: number) {
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
      and(
        eq(shottimerTable.id, 1),
        eq(shottimerTable.latestShotAt, new Date(receivedAt)),
      ),
    )
}

export async function setShottimerTarget(targetTimeSeconds: number | null) {
  const row = await readShottimer()
  if (!row?.enabled) return
  await updateShottimer({ targetTimeSeconds })
}

export async function loadShottimerTarget() {
  return (await readShottimer())?.targetTimeSeconds ?? null
}
