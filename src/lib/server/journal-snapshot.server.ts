import '@tanstack/react-start/server-only'
import {
  type JournalTable,
  journalTableMetadata,
  journalTableNames,
} from '@roastbook/journal-domain/model'
import {
  type JournalCommand,
  type JournalState,
  journalStateSchema,
} from '@roastbook/journal-domain/state'
import { type Column, eq, getTableColumns, type SQL, sql } from 'drizzle-orm'
import { db } from '@/db'
import { getJournalContext } from '@/db/journal-context.server'
import {
  type JournalMutation,
  runJournalMutations,
} from '@/db/journal-mutations.server'
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
import {
  cleanupUncommittedUpload,
  drainMediaCleanupQueue,
  queueMediaCleanup,
} from './media-lifecycle.server'

export async function loadJournalSnapshot(): Promise<JournalState> {
  if (DEMO_MODE) throw new Error('The demo journal is browser-only')
  await measureLegacyImageStorage()
  await db
    .insert(schema.settings)
    .values(journalInsertValues({ id: 1 }))
    .onConflictDoNothing()
  await db
    .insert(schema.journalSyncRevisions)
    .values(journalInsertValues({ value: 0 }))
    .onConflictDoNothing()
  for (let attempt = 0; attempt < 4; attempt++) {
    const before = await revision()
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
    const after = await revision()
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
async function revision() {
  const [row] = await db
    .select()
    .from(schema.journalSyncRevisions)
    .where(owned(schema.journalSyncRevisions))
  if (!row) throw new Error('Journal revision unavailable')
  return row.value
}

export async function applyJournalCommand(
  command: JournalCommand,
  expectedRevision: number,
) {
  if (DEMO_MODE) throw new Error('Demo server writes are disabled')
  // Only drain jobs from earlier committed requests. Newly queued deletions
  // must survive the enclosing PostgreSQL transaction before removing bytes.
  await drainMediaCleanupQueue()
  const [receipt] = await db
    .select()
    .from(schema.journalCommandReceipts)
    .where(
      owned(
        schema.journalCommandReceipts,
        eq(schema.journalCommandReceipts.commandId, command.id),
      ),
    )
  if (receipt) return loadJournalSnapshot()
  if (command.operation === 'images/uploadEntityImage') {
    const image = localImageUploadSchema.parse(command.data)
    if ((await journalImageDigest(image.files)) !== image.digest)
      throw new Error('Image data does not match its content digest')
  }
  const before = await loadJournalSnapshot()
  if (before.serverRevision !== expectedRevision)
    throw new Error(
      'JOURNAL_CONFLICT: Your journal changed on another device. Keep these local changes and resolve the conflict before syncing.',
    )
  const allocations = JSON.stringify(command.allocations)
  const { state: after } = executeCommand(before, command)
  if (JSON.stringify(command.allocations) !== allocations)
    throw new Error('Incomplete journal identifier reservations')
  const mutations: JournalMutation[] = [
    {
      statement: db
        .update(schema.journalSyncRevisions)
        .set({ value: sql`${schema.journalSyncRevisions.value}+1` })
        .where(
          owned(
            schema.journalSyncRevisions,
            eq(schema.journalSyncRevisions.value, expectedRevision),
          ),
        )
        .getSQL(),
      expectedChanges: 1,
      conflictMessage:
        'JOURNAL_CONFLICT: The journal changed. Reload and resolve your local changes.',
    },
  ]
  const order = dependencyOrder()
  const deletedMedia: string[] = []
  for (const name of order) {
    const previous = new Map(
      before.tables[name].map((row) => [
        Reflect.get(row, journalTableMetadata[name].primaryKey),
        row,
      ]),
    )
    const rows = [...after.tables[name]].sort(
      (a, b) =>
        Number(Reflect.get(a, 'isThumbnail') === true) -
          Number(Reflect.get(b, 'isThumbnail') === true) ||
        Number(
          !previous.has(Reflect.get(a, journalTableMetadata[name].primaryKey)),
        ) -
          Number(
            !previous.has(
              Reflect.get(b, journalTableMetadata[name].primaryKey),
            ),
          ),
    )
    for (const row of rows) {
      const id = Reflect.get(row, journalTableMetadata[name].primaryKey)
      const old = previous.get(id)
      if (JSON.stringify(old) === JSON.stringify(row)) continue
      mutations.push({
        statement: old ? update(name, row) : insert(name, row),
        expectedChanges: 1,
      })
    }
  }
  for (const name of [...order].reverse()) {
    const live = new Set(
      after.tables[name].map((row) =>
        Reflect.get(row, journalTableMetadata[name].primaryKey),
      ),
    )
    for (const row of before.tables[name]) {
      const id = Reflect.get(row, journalTableMetadata[name].primaryKey)
      if (live.has(id)) continue
      const columns: Record<string, Column> = getTableColumns(schema[name])
      const key = columns[journalTableMetadata[name].primaryKey]
      if (!key) throw new Error('Journal primary key missing')
      mutations.push({
        statement: sql`delete from ${schema[name]} where ${owned(schema[name])} and ${key} = ${id}`,
        expectedChanges: 1,
      })
      if ('storagePath' in row && typeof row.storagePath === 'string')
        deletedMedia.push(row.storagePath)
    }
  }
  mutations.push(...queueMediaCleanup(deletedMedia), {
    statement: db
      .insert(schema.journalCommandReceipts)
      .values(journalInsertValues({ commandId: command.id }))
      .getSQL(),
    expectedChanges: 1,
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
    const [completed] = await db
      .select()
      .from(schema.journalCommandReceipts)
      .where(
        owned(
          schema.journalCommandReceipts,
          eq(schema.journalCommandReceipts.commandId, command.id),
        ),
      )
    const snapshot = completed ? await loadJournalSnapshot() : undefined
    const referenced = new Set(
      Object.values(snapshot?.tables ?? {}).flatMap((rows) =>
        rows.flatMap((row) =>
          'storagePath' in row && typeof row.storagePath === 'string'
            ? [row.storagePath]
            : [],
        ),
      ),
    )
    for (const path of uploaded.filter(
      (path) =>
        !path.includes('.thumb.') &&
        !path.includes('.small.') &&
        !referenced.has(path),
    ))
      await cleanupUncommittedUpload(path)
    if (!completed) throw error
  }
  return loadJournalSnapshot()
}

function values(name: JournalTable, row: object) {
  const columns: Record<string, Column> = getTableColumns(schema[name])
  return Object.entries(row).map(([key, value]) => {
    const column = columns[key]
    if (!column) throw new Error('Unrecognized journal field')
    return {
      column,
      value: sql.param(
        journalTableMetadata[name].dates.includes(key) &&
          typeof value === 'string'
          ? new Date(value)
          : value,
        column,
      ),
    }
  })
}
function insert(name: JournalTable, row: object): SQL {
  const fields = values(name, row)
  return sql`insert into ${schema[name]} (${sql.identifier('owner_id')}, ${sql.join(
    fields.map(({ column }) => sql.identifier(column.name)),
    sql`, `,
  )}) values (${journalOwnerId()}, ${sql.join(
    fields.map(({ value }) => value),
    sql`, `,
  )})`
}
function update(name: JournalTable, row: object): SQL {
  const fields = values(name, row)
  const primary = journalTableMetadata[name].primaryKey
  const column: Column | undefined = Object.entries(
    getTableColumns(schema[name]),
  ).find(([key]) => key === primary)?.[1]
  if (!column) throw new Error('Journal primary key missing')
  return sql`update ${schema[name]} set ${sql.join(
    fields
      .filter((field) => field.column !== column)
      .map(
        ({ column, value }) => sql`${sql.identifier(column.name)} = ${value}`,
      ),
    sql`, `,
  )} where ${owned(schema[name])} and ${column} = ${Reflect.get(row, primary)}`
}
function dependencyOrder(): JournalTable[] {
  const complete = new Set<JournalTable>()
  const result: JournalTable[] = []
  function visit(table: JournalTable) {
    if (complete.has(table)) return
    complete.add(table)
    for (const reference of journalTableMetadata[table].foreignKeys)
      visit(reference.parent)
    result.push(table)
  }
  for (const name of journalTableNames) visit(name)
  return result
}
