import '@tanstack/react-start/server-only'
import { journalTableNames } from '@roastbook/journal-domain/model'
import {
  type JournalCommand,
  type JournalState,
  journalStateSchema,
} from '@roastbook/journal-domain/state'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { getJournalContext } from '@/db/journal-context.server'
import { runJournalMutations } from '@/db/journal-mutations.server'
import {
  journalInsertValues,
  journalOwnerId,
  owned,
} from '@/db/journal-scope.server'
import * as schema from '@/db/schema'
import { DEMO_MODE } from '@/lib/build-mode'
import { journalImageDigest } from '@/lib/journal-image-digest'
import { getStorage } from '@/lib/storage'
import { validateImageBuffer } from '@/lib/thumbnail-image'
import { executeCommand } from '@/modules/journal/commands'
import { localImageUploadSchema } from '@/modules/journal/images'
import {
  imageStoragePolicy,
  measureLegacyImageStorage,
} from './image-storage.server'
import { planJournalMutations } from './journal-mutation-plan.server'
import {
  cleanupUncommittedUpload,
  drainMediaCleanupQueue,
} from './media-lifecycle.server'

/** Read-only. Writes create the owner's settings and revision rows first. */
export async function loadJournalSnapshot(): Promise<JournalState> {
  if (DEMO_MODE) throw new Error('The demo journal is browser-only')
  for (let attempt = 0; attempt < 4; attempt++) {
    const before = await journalRevision()
    const tables = Object.fromEntries(
      await Promise.all(
        journalTableNames.map(async (name) => [
          name,
          (await db.select().from(schema[name]).where(owned(schema[name]))).map(
            ({ ownerId: _owner, ...row }) => row,
          ),
        ]),
      ),
    )
    const after = await journalRevision()
    if (before === after) {
      const identity = getJournalContext()?.identity
      return journalStateSchema.parse({
        format: 1,
        revision: 0,
        serverRevision: after,
        tables: JSON.parse(JSON.stringify(tables)),
        mediaNamespace: Buffer.from(journalOwnerId()).toString('base64url'),
        media: {},
        pending: [],
        policy: imageStoragePolicy(),
        account: identity?.authentication
          ? { id: identity.id, email: identity.email, role: identity.role }
          : null,
      })
    }
  }
  throw new Error('The journal is changing. Try again in a moment.')
}

/** Create the owner's journal rows and finish deferred storage work. POST only. */
export async function prepareJournalWrite() {
  if (DEMO_MODE) throw new Error('Demo server writes are disabled')
  // Only drain jobs from earlier committed requests. Newly queued deletions
  // must survive the enclosing PostgreSQL transaction before removing bytes.
  await drainMediaCleanupQueue()
  await measureLegacyImageStorage()
  await db
    .insert(schema.settings)
    .values(journalInsertValues({ id: 1 }))
    .onConflictDoNothing()
  await db
    .insert(schema.journalSyncRevisions)
    .values(journalInsertValues({ value: 0 }))
    .onConflictDoNothing()
}

/** A missing row means the owner has never written through sync. */
export async function journalRevision() {
  const [row] = await db
    .select()
    .from(schema.journalSyncRevisions)
    .where(owned(schema.journalSyncRevisions))
  return row?.value ?? 0
}

/**
 * Replays a command on the latest server journal. Unrelated changes from other
 * devices are merged; a command that no longer applies is a conflict.
 */
export async function applyJournalCommand(
  command: JournalCommand,
  expectedRevision: number,
): Promise<JournalState> {
  await prepareJournalWrite()
  if (await commandWasApplied(command.id)) return loadJournalSnapshot()
  if (command.operation === 'images/uploadEntityImage') {
    const image = localImageUploadSchema.parse(command.data)
    if ((await journalImageDigest(image.files)) !== image.digest)
      throw new Error('Image data does not match its content digest')
  }
  const before = await loadJournalSnapshot()
  const allocations = JSON.stringify(command.allocations)
  let after: JournalState
  try {
    after = executeCommand(before, command).state
  } catch (error) {
    if (before.serverRevision === expectedRevision) throw error
    throw new Error(
      `JOURNAL_CONFLICT: ${error instanceof Error ? error.message : 'Your change no longer applies to the latest journal.'}`,
      { cause: error },
    )
  }
  if (JSON.stringify(command.allocations) !== allocations)
    throw new Error('Incomplete journal identifier reservations')
  const mutations = planJournalMutations({
    before,
    after,
    commandId: command.id,
  })
  const uploaded: string[] = []
  try {
    for (const [path, file] of Object.entries(after.media)) {
      const bytes = Buffer.from(file.data, 'base64')
      await validateImageBuffer(bytes, file.mimeType)
      await getStorage().upload(
        new Blob([new Uint8Array(bytes)], { type: file.mimeType }),
        path,
      )
      uploaded.push(path)
    }
    await runJournalMutations(mutations)
  } catch (error) {
    if (await commandWasApplied(command.id)) return loadJournalSnapshot()
    // Cleaning an original also removes its thumbnails.
    for (const path of uploaded.filter(
      (path) => !path.includes('.thumb.') && !path.includes('.small.'),
    ))
      await cleanupUncommittedUpload(path)
    throw error
  }
  // The planned SQL writes exactly these rows, so the database now matches them.
  return { ...after, media: {}, serverRevision: before.serverRevision + 1 }
}

async function commandWasApplied(commandId: string) {
  const [receipt] = await db
    .select({ commandId: schema.journalCommandReceipts.commandId })
    .from(schema.journalCommandReceipts)
    .where(
      owned(
        schema.journalCommandReceipts,
        eq(schema.journalCommandReceipts.commandId, commandId),
      ),
    )
  return receipt !== undefined
}
