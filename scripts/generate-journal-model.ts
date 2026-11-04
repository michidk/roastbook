import { format } from 'node:util'
import { getTableColumns, getTableName, is, SQL } from 'drizzle-orm'
import { getTableConfig, PgDialect, PgTable } from 'drizzle-orm/pg-core'
import * as schema from '../src/db/schema'

// Authentication, credentials, jobs and replication bookkeeping never enter a client journal.
const excluded = new Set([
  'shottimer',
  'mcpSettings',
  'mcpAuditEvents',
  'aiUsage',
  'aiRequestLogs',
  'replicationChanges',
  'clientOperations',
  'mediaCleanupJobs',
  'journalSyncRevisions',
  'journalCommandReceipts',
])
const tables: [string, PgTable][] = []
for (const [name, value] of Object.entries(schema)) {
  if (
    is(value, PgTable) &&
    'ownerId' in getTableColumns(value) &&
    !excluded.has(name) &&
    !name.startsWith('ai')
  )
    tables.push([name, value])
}

const tableNames = new Map(
  tables.map(([name, table]) => [getTableName(table), name]),
)
const dialect = new PgDialect()
const literal = (value: unknown) => JSON.stringify(value)
const declarations: string[] = []
const metadata: string[] = []
for (const [name, table] of tables) {
  const config = getTableConfig(table)
  const columns = getTableColumns(table)
  const keyOf = (column: { name: string }) =>
    Object.entries(columns).find(
      ([, candidate]) => candidate.name === column.name,
    )?.[0]
  const fields: string[] = []
  const defaults: Record<string, unknown> = {}
  const dates: string[] = []
  for (const [key, column] of Object.entries(columns)) {
    if (key === 'ownerId') continue
    let validator: string
    if (column.enumValues?.length)
      validator = `z.enum(${literal(column.enumValues)})`
    else if (column.dataType === 'date') {
      validator = 'z.iso.datetime({ offset: true })'
      dates.push(key)
    } else if (column.dataType === 'boolean') validator = 'z.boolean()'
    else if (column.dataType === 'number')
      validator = /^Pg(?:Integer|Serial|SmallInt|SmallSerial)$/.test(
        column.columnType,
      )
        ? 'z.number().int()'
        : 'z.number().finite()'
    else if ('scale' in column && typeof column.scale === 'number')
      validator = `z.string().transform(value=>normalizeDecimal(value,${'precision' in column ? column.precision : 10},${column.scale}))`
    else if (column.dataType === 'json') validator = 'z.json()'
    else if (column.dataType === 'array') validator = 'z.array(z.string())'
    else validator = 'z.string()'
    if (!column.notNull) validator += '.nullable()'
    fields.push(`${key}: ${validator}`)
    if (column.default !== undefined) {
      if (is(column.default, SQL)) {
        const query = dialect.sqlToQuery(column.default).sql
        if (query === 'now()') defaults[key] = { kind: 'now' }
        else if (
          query === 'gen_random_uuid()' ||
          query === 'md5(random()::text || clock_timestamp()::text)'
        )
          defaults[key] = { kind: 'uuid' }
        else {
          // PostgreSQL JSON defaults and cast literals are resolved by the generator.
          const matched = /^'(.*)'(?:::[\w\s[\]]+)?$/.exec(query)
          if (matched?.[1] === undefined)
            throw new Error(`Unsupported default ${name}.${key}: ${query}`)
          const value = matched[1].replaceAll("''", "'")
          defaults[key] = {
            kind: 'value',
            value:
              column.dataType === 'json'
                ? JSON.parse(value)
                : column.dataType === 'array'
                  ? value
                      .slice(1, -1)
                      .split(',')
                      .filter(Boolean)
                      .map((item) => item.replace(/^"|"$/g, ''))
                  : value,
          }
        }
      } else defaults[key] = { kind: 'value', value: column.default }
    } else if (!column.notNull) defaults[key] = { kind: 'value', value: null }
  }
  declarations.push(
    `export const ${name}RowSchema = z.strictObject({${fields.join(',\n')}})`,
  )
  const foreignKeys = config.foreignKeys.flatMap((foreignKey) => {
    const reference = foreignKey.reference()
    const parent = tableNames.get(getTableName(reference.foreignTable))
    if (!parent) return []
    const parentColumns = getTableColumns(reference.foreignTable)
    return [
      {
        columns: reference.columns
          .filter((c) => c.name !== 'owner_id')
          .map(keyOf),
        parent,
        parentColumns: reference.foreignColumns
          .filter((c) => c.name !== 'owner_id')
          .map(
            (c) =>
              Object.entries(parentColumns).find(
                ([, v]) => v.name === c.name,
              )?.[0],
          ),
        onDelete: foreignKey.onDelete ?? 'no action',
      },
    ]
  })
  const unique = [
    ...Object.entries(columns)
      .filter(([, c]) => c.isUnique)
      .map(([key]) => [key]),
    ...config.uniqueConstraints.map((c) =>
      c.columns.map(keyOf).filter((k) => k !== 'ownerId'),
    ),
    ...config.indexes
      .filter((index) => index.config.unique && !index.config.where)
      .map((index) =>
        index.config.columns
          .map((column) =>
            'name' in column && typeof column.name === 'string'
              ? keyOf({ name: column.name })
              : undefined,
          )
          .filter(
            (key): key is string => key !== undefined && key !== 'ownerId',
          ),
      ),
  ]
  const partialUnique = config.indexes
    .filter((index) => index.config.unique && index.config.where)
    .map((index) => {
      const condition = index.config.where
      if (!condition) throw new Error('Missing unique index condition')
      const query = dialect.sqlToQuery(condition)
      const match = /^"[^"]+"\."([^"]+)" (is null|= true)$/.exec(query.sql)
      if (!match?.[1] || !match[2] || query.params.length)
        throw new Error(`Unsupported partial index ${name}: ${query.sql}`)
      const column = keyOf({ name: match[1] })
      if (!column) throw new Error(`Unknown partial index column: ${name}`)
      return {
        columns: index.config.columns
          .map((column) =>
            'name' in column && typeof column.name === 'string'
              ? keyOf({ name: column.name })
              : undefined,
          )
          .filter((key) => key !== 'ownerId'),
        column,
        value: match[2] === 'is null' ? null : true,
      }
    })
  const primaryKey =
    Object.entries(columns).find(
      ([key, column]) => key !== 'ownerId' && column.primary,
    )?.[0] ?? 'id'
  metadata.push(
    `${name}: ${literal({ primaryKey, defaults, dates, foreignKeys, unique, partialUnique })}`,
  )
}
const rawOutput = `// Generated by scripts/generate-journal-model.ts. Run bun run generate:journal-model.\nimport { z } from 'zod'\nimport { normalizeDecimal } from './decimal'\n\n${declarations.join('\n\n')}\n\nexport const journalTablesSchema = z.strictObject({${tables.map(([name]) => `${name}: z.array(${name}RowSchema)`).join(',\n')}})\nexport type JournalTables = z.infer<typeof journalTablesSchema>\nexport type JournalTable = keyof JournalTables\nexport type JournalRow<T extends JournalTable> = JournalTables[T][number]\nexport const journalRowSchemas = {${tables.map(([name]) => `${name}: ${name}RowSchema`).join(',')}}\nexport type TableMetadata = { primaryKey: string; defaults: Record<string, {kind:"now"} | {kind:"uuid"} | {kind:"value";value:unknown}>; dates:string[]; foreignKeys: {columns:string[];parent:JournalTable;parentColumns:string[];onDelete:string}[]; unique:string[][]; partialUnique:{columns:string[];column:string;value:null|true}[] }\nexport const journalTableMetadata: Record<JournalTable,TableMetadata> = {${metadata.join(',\n')}}\nexport const journalTableNames = Object.keys(journalRowSchemas) as JournalTable[]\n`
const path = 'packages/journal-domain/src/model.generated.ts'
const formatted = Bun.spawn(
  ['bun', 'x', '--no-install', 'biome', 'format', '--stdin-file-path', path],
  { stdin: new Blob([rawOutput]), stdout: 'pipe', stderr: 'pipe' },
)
const output = await new Response(formatted.stdout).text()
if ((await formatted.exited) !== 0)
  throw new Error(await new Response(formatted.stderr).text())
if (process.argv.includes('--check')) {
  if ((await Bun.file(path).text()) !== output)
    throw new Error(
      'Journal model is stale. Run bun run generate:journal-model.',
    )
} else await Bun.write(path, output)
console.log(
  format(
    'Portable journal model %s (%d tables)',
    process.argv.includes('--check') ? 'checked' : 'generated',
    tables.length,
  ),
)
