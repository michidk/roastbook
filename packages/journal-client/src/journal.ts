import { getStoredImagePaths } from '@roastbook/journal-domain/media-path'
import {
  type JournalCommand,
  type JournalState,
  journalStateSchema,
} from '@roastbook/journal-domain/state'
import type { RxCollection, RxDatabase, RxJsonSchema } from 'rxdb'
import { z } from 'zod'

const documentSchema = z.strictObject({
  id: z.literal('journal'),
  value: journalStateSchema,
})
type JournalDocument = z.infer<typeof documentSchema>
type MediaDocument = { id: string; mimeType: string; data: string }
type JournalDatabase = RxDatabase<{
  journal: RxCollection<JournalDocument>
  media: RxCollection<MediaDocument>
}>
export type JournalMedia = JournalState['media']
const schema: RxJsonSchema<JournalDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 20 },
    value: { type: 'object', additionalProperties: true },
  },
  required: ['id', 'value'],
  additionalProperties: false,
}
const mediaSchema: RxJsonSchema<MediaDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 500 },
    mimeType: { type: 'string' },
    data: { type: 'string' },
  },
  required: ['id', 'mimeType', 'data'],
  additionalProperties: false,
}
export type JournalExecutor = (
  state: JournalState,
  command: JournalCommand,
) => { state: JournalState; result: unknown }
export type JournalTransport = {
  /** Resolves null when the server journal is unchanged since `state`. */
  load(state?: JournalState): Promise<JournalState | null>
  /** `state` is null when nothing else changed the server journal. */
  send(
    command: JournalCommand,
    revision: number,
  ): Promise<{ serverRevision: number; state: JournalState | null }>
}
export type JournalOptions = {
  name: string
  bootstrap(): Promise<JournalState>
  execute: JournalExecutor
  transport?: JournalTransport
}

/**
 * The journal and its outbox are one atomic RxDB document. New image bytes are
 * staged in that document's `media` and then moved to a separate collection, so
 * ordinary changes do not copy every picture.
 */
export class ClientJournal {
  private synchronizing: Promise<void> | undefined
  private constructor(
    private readonly database: JournalDatabase,
    private readonly options: JournalOptions,
  ) {}

  static async open(options: JournalOptions): Promise<ClientJournal> {
    const database = await openDatabase(options.name)
    try {
      const existing = await database.journal.findOne('journal').exec()
      if (!existing) {
        const value = journalStateSchema.parse(await options.bootstrap())
        // Another tab may seed while bootstrap is loading. Never upsert over it.
        try {
          await database.journal.insert({ id: 'journal', value })
        } catch (error) {
          if (!(await database.journal.findOne('journal').exec())) throw error
        }
      } else {
        const parsed = documentSchema.safeParse({
          id: existing.id,
          value: existing.toJSON().value,
        })
        if (!parsed.success)
          throw new Error(
            'This saved journal uses an unsupported format or contains invalid data. Your data has not been changed. Use the application version that saved it or contact support.',
            { cause: parsed.error },
          )
      }
      const journal = new ClientJournal(database, options)
      await journal.storeStagedMedia().catch(() => undefined)
      return journal
    } catch (error) {
      await database.close()
      throw storageError(error)
    }
  }

  /** Explicit reset after confirmation also recovers an unsupported demo format. */
  static async restoreDemo(
    options: Pick<JournalOptions, 'name' | 'bootstrap'>,
  ): Promise<void> {
    const seed = journalStateSchema.parse(await options.bootstrap())
    const database = await openDatabase(options.name)
    try {
      const existing = await database.journal.findOne('journal').exec()
      if (existing)
        await existing.incrementalModify((current) => ({
          ...current,
          value: seed,
        }))
      else await database.journal.insert({ id: 'journal', value: seed })
      await database.media.find().remove()
    } catch (error) {
      throw storageError(error)
    } finally {
      await database.close()
    }
  }

  async read(): Promise<JournalState> {
    const document = await this.database.journal.findOne('journal').exec()
    if (!document)
      throw new Error(
        'The local journal is unavailable. Your saved data has not been reset.',
      )
    return journalStateSchema.parse(document.toJSON().value)
  }

  /** Stored and staged image bytes by storage path. */
  subscribeMedia(listener: (media: JournalMedia) => void): () => void {
    let staged: JournalMedia = {}
    let stored: JournalMedia = {}
    const emit = () => listener({ ...stored, ...staged })
    const journal = this.subscribe((state) => {
      staged = state.media
      emit()
    })
    const media = this.database.media.find().$.subscribe((documents) => {
      stored = Object.fromEntries(
        documents.map(({ id, mimeType, data }) => [id, { mimeType, data }]),
      )
      emit()
    })
    return () => {
      journal()
      media.unsubscribe()
    }
  }

  subscribe(listener: (state: JournalState) => void): () => void {
    const subscription = this.database.journal
      .findOne('journal')
      .$.subscribe((document) => {
        if (document)
          listener(journalStateSchema.parse(document.toJSON().value))
      })
    return () => subscription.unsubscribe()
  }

  async command(
    operation: string,
    data: z.infer<ReturnType<typeof z.json>>,
  ): Promise<unknown> {
    const command: JournalCommand = {
      id: crypto.randomUUID(),
      operation,
      data,
      createdAt: new Date().toISOString(),
      allocations: {},
    }
    let result: unknown
    await this.change((state) => {
      command.allocations = {}
      const executed = this.options.execute(state, command)
      result = executed.result
      return {
        ...executed.state,
        revision: state.revision + 1,
        pending: this.options.transport
          ? [...state.pending, { command, status: 'pending', error: null }]
          : [],
      }
    })
    // On failure the bytes stay staged and move after a later command.
    await this.storeStagedMedia().catch(() => undefined)
    return result
  }

  /** Refresh only after replaying saved commands. Conflicts retain the local journal. */
  async synchronize(): Promise<void> {
    this.synchronizing ??= Promise.resolve()
      .then(() => {
        const run = () => this.flush()
        return typeof navigator !== 'undefined' && navigator.locks
          ? navigator.locks.request(`roastbook-sync:${this.options.name}`, run)
          : run()
      })
      .finally(() => {
        this.synchronizing = undefined
      })
    return this.synchronizing
  }

  private async flush(): Promise<void> {
    const transport = this.options.transport
    if (!transport) return
    // Each write reports whether another device changed the journal, so a
    // refresh after this device's own writes is a cheap revision check.
    for (;;) {
      const state = await this.read()
      const next = state.pending[0]
      if (!next) {
        const remote = await transport.load(state)
        if (remote)
          await this.change((current) =>
            current.pending.length ||
            current.revision !== state.revision ||
            remote.serverRevision < current.serverRevision
              ? current
              : {
                  ...remote,
                  media: retainMedia(current, remote),
                  identifiers: mergeIdentifiers(current, remote),
                  revision: current.revision + 1,
                },
          )
        return
      }
      if (next.status !== 'pending') return
      try {
        const reply = await transport.send(next.command, state.serverRevision)
        await this.change((current) => {
          if (
            !current.pending.some(
              (entry) => entry.command.id === next.command.id,
            )
          )
            return current
          const remaining = current.pending.filter(
            (entry) => entry.command.id !== next.command.id,
          )
          const remote = reply.state
          // Same base, same command: the local tables already equal the server's.
          if (!remote)
            return {
              ...current,
              serverRevision: reply.serverRevision,
              pending: remaining,
              revision: current.revision + 1,
            }
          let rebased = {
            ...remote,
            media: retainMedia(current, remote),
            identifiers: mergeIdentifiers(current, remote),
          }
          try {
            for (const entry of remaining)
              rebased = this.options.execute(rebased, entry.command).state
          } catch (error) {
            // The server confirmed the first command. Keep later local edits if
            // another device made their relationships or base revisions stale.
            return {
              ...current,
              serverRevision: remote.serverRevision,
              pending: remaining.map((entry) => ({
                ...entry,
                status: 'conflict' as const,
                error:
                  error instanceof Error
                    ? error.message
                    : 'The server journal changed. Review your saved changes.',
              })),
              revision: current.revision + 1,
            }
          }
          return {
            ...rebased,
            pending: remaining,
            revision: current.revision + 1,
          }
        })
      } catch (error) {
        // Network failures leave commands runnable. Explicit server rejections need user resolution.
        if (error instanceof JournalSyncError) {
          await this.change((current) => ({
            ...current,
            revision: current.revision + 1,
            pending: current.pending.map((entry) =>
              entry.command.id === next.command.id
                ? { ...entry, status: error.kind, error: error.message }
                : entry,
            ),
          }))
        }
        throw error
      }
    }
  }

  async resolvePending(action: 'retry' | 'reapply' | 'server'): Promise<void> {
    const transport = this.options.transport
    if (!transport) throw new Error('Demo journals do not synchronize')
    if (action === 'retry') {
      await this.change((current) => ({
        ...current,
        revision: current.revision + 1,
        pending: current.pending.map((entry) => ({
          ...entry,
          status: 'pending',
          error: null,
        })),
      }))
      return
    }
    const before = await this.read()
    // Resolution needs the complete server journal, not a revision check.
    const remote = await transport.load()
    if (!remote) throw new Error('The server journal is unavailable')
    await this.change((current) => {
      if (current.revision !== before.revision)
        throw new Error(
          'Your local journal changed while resolving. Try again.',
        )
      if (action === 'server')
        return {
          ...remote,
          identifiers: mergeIdentifiers(current, remote),
          revision: current.revision + 1,
        }
      const pending = current.pending.map((entry) => {
        const data = entry.command.data
        const changes =
          data && typeof data === 'object' && !Array.isArray(data)
            ? Object.fromEntries(
                Object.entries(data).filter(
                  ([key]) => key !== 'baseRevision' && key !== 'baseUpdatedAt',
                ),
              )
            : data
        return {
          ...entry,
          command: { ...entry.command, data: changes },
          status: 'pending' as const,
          error: null,
        }
      })
      return {
        ...current,
        serverRevision: remote.serverRevision,
        pending,
        revision: current.revision + 1,
      }
    })
  }

  async reset(): Promise<void> {
    if (this.options.transport)
      throw new Error('Product journals cannot be reset as demos')
    const seed = journalStateSchema.parse(await this.options.bootstrap())
    await this.change((state) => ({ ...seed, revision: state.revision + 1 }))
    await this.database.media.find().remove()
  }

  async remove(): Promise<void> {
    if ((await this.read()).pending.length)
      throw new Error(
        'Sync or resolve pending changes before clearing this journal.',
      )
    await this.database.remove()
  }

  close(): Promise<boolean> {
    return this.database.close()
  }

  private async change(
    update: (state: JournalState) => JournalState,
  ): Promise<void> {
    const document = await this.database.journal.findOne('journal').exec()
    if (!document) throw new Error('Local journal not found')
    let removed: string[] = []
    try {
      await document.incrementalModify((current) => {
        const before = journalStateSchema.parse(current.value)
        const after = journalStateSchema.parse(update(before))
        const live = imagePaths(after)
        removed = [...imagePaths(before)].filter((path) => !live.has(path))
        return { ...current, value: after }
      })
    } catch (error) {
      throw storageError(error)
    }
    // Removing orphaned bytes is best effort; the journal change is committed.
    if (removed.length)
      await this.database.media.bulkRemove(removed).catch(() => undefined)
  }

  /** Move staged bytes out of the journal document. On failure they stay staged. */
  private async storeStagedMedia(): Promise<void> {
    const staged = (await this.read()).media
    const paths = Object.keys(staged)
    if (!paths.length) return
    try {
      await this.database.media.bulkUpsert(
        Object.entries(staged).map(([id, file]) => ({ id, ...file })),
      )
    } catch (error) {
      throw storageError(error)
    }
    await this.change((current) => ({
      ...current,
      media: Object.fromEntries(
        Object.entries(current.media).filter(([path]) => !paths.includes(path)),
      ),
    }))
  }
}

export class JournalSyncError extends Error {
  constructor(
    readonly kind: 'conflict' | 'auth-required' | 'failed',
    message: string,
  ) {
    super(message)
  }
}

function mergeIdentifiers(
  current: JournalState,
  remote: JournalState,
): JournalState['identifiers'] {
  if (current.identifiers === null) return remote.identifiers
  const result = structuredClone(current.identifiers)
  for (const [table, ids] of Object.entries(remote.identifiers ?? {}))
    result[table] = [...new Set([...(result[table] ?? []), ...ids])]
  return result
}

function imagePaths(state: JournalState): Set<string> {
  return new Set(
    getStoredImagePaths(
      Object.values(state.tables).flatMap((rows) =>
        rows.flatMap((row) =>
          'storagePath' in row && typeof row.storagePath === 'string'
            ? [row.storagePath]
            : [],
        ),
      ),
    ),
  )
}

/** Keep staged bytes that the incoming journal still references. */
function retainMedia(
  current: JournalState,
  remote: JournalState,
): JournalState['media'] {
  const paths = imagePaths(remote)
  return Object.fromEntries(
    Object.entries({ ...current.media, ...remote.media }).filter(([path]) =>
      paths.has(path),
    ),
  )
}

function isQuotaError(error: unknown, visited = new Set<unknown>()): boolean {
  if (!error || typeof error !== 'object' || visited.has(error)) return false
  visited.add(error)
  return (
    Reflect.get(error, 'name') === 'QuotaExceededError' ||
    Object.values(error).some((nested) => {
      return Array.isArray(nested)
        ? nested.some((value) => isQuotaError(value, visited))
        : isQuotaError(nested, visited)
    })
  )
}

async function openDatabase(name: string): Promise<JournalDatabase> {
  const [{ createRxDatabase }, { getRxStorageDexie }] = await Promise.all([
    import('rxdb'),
    import('rxdb/plugins/storage-dexie'),
  ])
  try {
    const database = await createRxDatabase<JournalDatabase>({
      name,
      storage: getRxStorageDexie(),
      multiInstance: true,
    })
    try {
      await database.addCollections({
        journal: { schema },
        media: { schema: mediaSchema },
      })
      return database
    } catch (error) {
      await database.close()
      throw error
    }
  } catch (error) {
    throw storageError(error)
  }
}

function storageError(error: unknown): unknown {
  if (isQuotaError(error))
    return new Error(
      'Browser storage is full. Your previous saved journal is preserved. Remove pictures or free space and try again.',
      { cause: error },
    )
  if (
    error instanceof Error &&
    /indexeddb|securityerror|invalidstateerror|versionerror/i.test(
      `${error.name} ${error.message}`,
    )
  )
    return new Error(
      'Browser storage is unavailable or uses a newer format. Your saved journal has not been reset. Check site storage permissions or use the application version that saved it.',
      { cause: error },
    )
  return error
}
