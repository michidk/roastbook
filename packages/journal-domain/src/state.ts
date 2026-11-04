import { z } from 'zod'
import {
  type JournalRow,
  type JournalTable,
  type JournalTables,
  journalRowSchemas,
  journalTableMetadata,
  journalTableNames,
  journalTablesSchema,
} from './model.generated'

export const journalCommandSchema = z.strictObject({
  id: z.uuid(),
  operation: z.string().min(1).max(100),
  data: z.json(),
  createdAt: z.iso.datetime(),
  allocations: z.record(z.string(), z.array(z.number().int().positive())),
})
export type JournalCommand = z.infer<typeof journalCommandSchema>

export const journalStateSchema = z.strictObject({
  format: z.literal(1),
  revision: z.number().int().nonnegative(),
  serverRevision: z.number().int().nonnegative(),
  tables: journalTablesSchema,
  identifiers: z
    .record(z.string(), z.array(z.number().int().positive()))
    .nullable()
    .default(null),
  account: z
    .object({
      id: z.string(),
      email: z.string(),
      role: z.enum(['user', 'admin']),
    })
    .nullable()
    .default(null),
  policy: z
    .object({
      maxImagesPerItem: z.number().int().positive(),
      limitBytes: z.number().int().nonnegative().nullable(),
    })
    .default({ maxImagesPerItem: 3, limitBytes: 50 * 1024 * 1024 }),
  mediaNamespace: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .default('demo'),
  media: z.record(
    z.string(),
    z.strictObject({
      mimeType: z.string(),
      data: z.string(),
    }),
  ),
  pending: z.array(
    z.strictObject({
      command: journalCommandSchema,
      status: z.enum(['pending', 'conflict', 'auth-required', 'failed']),
      error: z.string().nullable(),
    }),
  ),
})
export type JournalState = z.infer<typeof journalStateSchema>

export function emptyJournalTables(): JournalTables {
  return journalTablesSchema.parse(
    Object.fromEntries(journalTableNames.map((name) => [name, []])),
  )
}

/** One typed mutation workspace. Call finish before committing any storage changes. */
export class JournalTransaction {
  readonly tables: JournalTables
  private readonly now: string
  private readonly uuid: () => string
  private readonly allocate: (table: JournalTable) => number

  constructor(
    tables: JournalTables,
    options: {
      now?: string
      allocate?: (table: JournalTable) => number
      uuid?: () => string
    } = {},
  ) {
    this.uuid = options.uuid ?? (() => crypto.randomUUID())
    this.tables = structuredClone(tables)
    this.now = options.now ?? new Date().toISOString()
    this.allocate =
      options.allocate ??
      ((table) =>
        Math.max(0, ...this.rows(table).map((row) => this.key(table, row))) + 1)
  }

  rows<T extends JournalTable>(table: T): JournalRow<T>[] {
    // The table discriminant selects a member of the validated mapped schema.
    return this.tables[table] as JournalRow<T>[]
  }

  key(table: JournalTable, row: object): number {
    return z
      .number()
      .int()
      .parse(Reflect.get(row, journalTableMetadata[table].primaryKey))
  }

  get<T extends JournalTable>(table: T, id: number): JournalRow<T> {
    const row = this.rows(table).find((row) => this.key(table, row) === id)
    if (!row) throw new Error('Record not found. Reload and try again.')
    return row
  }

  insert<T extends JournalTable>(
    table: T,
    values: Partial<JournalRow<T>>,
  ): JournalRow<T> {
    const defaults = Object.fromEntries(
      Object.entries(journalTableMetadata[table].defaults).map(
        ([key, value]) => [
          key,
          value.kind === 'now'
            ? this.now
            : value.kind === 'uuid'
              ? this.uuid()
              : value.value,
        ],
      ),
    )
    const row = this.parse(table, {
      ...defaults,
      ...(journalTableMetadata[table].primaryKey === 'id' && !('id' in values)
        ? { id: this.allocate(table) }
        : {}),
      ...Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined),
      ),
    })
    if (
      this.rows(table).some(
        (current) => this.key(table, current) === this.key(table, row),
      )
    )
      throw new Error('Journal identifier is already in use')
    this.rows(table).push(row)
    return row
  }

  update<T extends JournalTable>(
    table: T,
    id: number,
    values: Partial<JournalRow<T>>,
  ): JournalRow<T> {
    const current = this.get(table, id)
    const changes = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== undefined),
    )
    if (
      changes[journalTableMetadata[table].primaryKey] !== undefined &&
      changes[journalTableMetadata[table].primaryKey] !== id
    )
      throw new Error('Cannot change a record identifier')
    const row = this.parse(table, {
      ...current,
      ...('updatedAt' in current ? { updatedAt: this.now } : {}),
      ...changes,
    })
    const rows = this.rows(table)
    rows.splice(
      rows.findIndex((current) => this.key(table, current) === id),
      1,
      row,
    )
    return row
  }

  delete(table: JournalTable, id: number): void {
    const row = this.get(table, id)
    const rows = this.rows(table)
    rows.splice(
      rows.findIndex((current) => this.key(table, current) === id),
      1,
    )
    for (const child of journalTableNames) {
      for (const reference of journalTableMetadata[child].foreignKeys) {
        if (reference.parent !== table) continue
        for (const related of [...this.rows(child)]) {
          if (
            !reference.columns.every(
              (column, index) =>
                Reflect.get(related, column) !== null &&
                Reflect.get(related, column) ===
                  Reflect.get(row, reference.parentColumns[index] ?? 'id'),
            )
          )
            continue
          if (reference.onDelete === 'cascade')
            this.delete(child, this.key(child, related))
          else if (reference.onDelete === 'set null') {
            this.update(
              child,
              this.key(child, related),
              Object.fromEntries(
                reference.columns.map((column) => [column, null]),
              ),
            )
          } else
            throw new Error(
              'This record is still in use. Remove its relationships first.',
            )
        }
      }
    }
  }

  deleteWhere<T extends JournalTable>(
    table: T,
    matches: (row: JournalRow<T>) => boolean,
  ): void {
    for (const row of [...this.rows(table)])
      if (matches(row)) this.delete(table, this.key(table, row))
  }

  finish(): JournalTables {
    const result = journalTablesSchema.parse(this.tables)
    for (const table of journalTableNames) {
      const primaryKeys = new Set<number>()
      for (const row of result[table]) {
        const primary = this.key(table, row)
        if (primaryKeys.has(primary))
          throw new Error('Duplicate journal identifier')
        primaryKeys.add(primary)
        for (const reference of journalTableMetadata[table].foreignKeys) {
          const values = reference.columns.map((column) =>
            Reflect.get(row, column),
          )
          if (values.some((value) => value === null)) continue
          if (
            !result[reference.parent].some((parent) =>
              reference.parentColumns.every(
                (column, index) =>
                  Reflect.get(parent, column) === values[index],
              ),
            )
          ) {
            throw new Error(
              'A related record is unavailable. Reload and choose it again.',
            )
          }
        }
      }
      const constraints = [
        ...journalTableMetadata[table].unique.map((columns) => ({
          columns,
          rows: result[table],
        })),
        ...journalTableMetadata[table].partialUnique.map((constraint) => ({
          columns: constraint.columns,
          rows: result[table].filter(
            (row) => Reflect.get(row, constraint.column) === constraint.value,
          ),
        })),
      ]
      for (const { columns: unique, rows } of constraints) {
        const seen = new Set<string>()
        const primaryKeys = new Set<number>()
        for (const row of rows) {
          const primary = this.key(table, row)
          if (primaryKeys.has(primary))
            throw new Error('Duplicate journal identifier')
          primaryKeys.add(primary)
          const values = unique.map((column) => Reflect.get(row, column))
          if (values.some((value) => value === null)) continue
          const key = JSON.stringify(values)
          if (seen.has(key))
            throw new Error('A record with these values already exists')
          seen.add(key)
        }
      }
    }
    return result
  }

  private parse<T extends JournalTable>(
    table: T,
    input: unknown,
  ): JournalRow<T> {
    // Zod validates each field using the schema associated with this table key.
    return journalRowSchemas[table].parse(input) as JournalRow<T>
  }
}
