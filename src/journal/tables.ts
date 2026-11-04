import { getTableColumns, getTableName, is, Table } from 'drizzle-orm'
import * as schema from '@/db/schema'

// Owner tables that only the server keeps: integration state, audit logs and
// sync bookkeeping. Every other owner table is journal data and is synced.
const serverOnly = new Set([
  'ai_request_logs',
  'ai_usage',
  'journal_command_receipts',
  'journal_id_reservations',
  'journal_sync_revisions',
  'mcp_audit_events',
  'mcp_settings',
  'media_cleanup_jobs',
  'shottimer',
])

// `Table` covers both schemas: the hosted build swaps in the D1 (SQLite) one.
export const journalTables: Table[] = Object.values(
  schema as Record<string, unknown>,
).filter(
  (table): table is Table =>
    is(table, Table) &&
    'ownerId' in getTableColumns(table) &&
    !serverOnly.has(getTableName(table)),
)

/** Tables whose integer `id` the server assigns; offline creates use reserved ones. */
export const reservedIdTables = journalTables.filter((table) => {
  const id = getTableColumns(table).id
  return id?.primary === true && id.dataType === 'number'
})
