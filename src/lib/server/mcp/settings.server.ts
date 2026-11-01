import '@tanstack/react-start/server-only'

import { getRequest } from '@tanstack/react-start/server'
import { count, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { mcpAuditEvents, mcpSettings } from '@/db/schema'
import {
  MCP_TOOL_CATALOG,
  MCP_TOOL_NAMES,
  type McpToolName,
} from '@/lib/mcp/catalog'
import { getMcpEndpoint } from './config.server'

export type McpPolicy = {
  enabled: boolean
  disabledTools: McpToolName[]
}

const DEFAULT_POLICY: McpPolicy = { enabled: true, disabledTools: [] }

function knownDisabledTools(values: readonly string[]) {
  const known = new Set<string>(MCP_TOOL_NAMES)
  return values.filter((value): value is McpToolName => known.has(value))
}

export async function loadMcpPolicy(): Promise<McpPolicy> {
  const [row] = await db
    .select({
      enabled: mcpSettings.enabled,
      disabledTools: mcpSettings.disabledTools,
    })
    .from(mcpSettings)
    .where(eq(mcpSettings.id, 'instance'))
    .limit(1)
  return row
    ? {
        enabled: row.enabled,
        disabledTools: knownDisabledTools(row.disabledTools),
      }
    : DEFAULT_POLICY
}

export async function saveMcpPolicy(policy: {
  enabled: boolean
  disabledTools: readonly string[]
}) {
  const disabledTools = knownDisabledTools(policy.disabledTools)
  const [row] = await db
    .insert(mcpSettings)
    .values({ id: 'instance', enabled: policy.enabled, disabledTools })
    .onConflictDoUpdate({
      target: mcpSettings.id,
      set: { enabled: policy.enabled, disabledTools, updatedAt: new Date() },
    })
    .returning({
      enabled: mcpSettings.enabled,
      disabledTools: mcpSettings.disabledTools,
    })
  return {
    enabled: row?.enabled ?? policy.enabled,
    disabledTools: knownDisabledTools(row?.disabledTools ?? disabledTools),
  }
}

export type McpAuditEvent = {
  event: string
  outcome: string
  toolName?: string
}

export async function recordMcpAudit(event: McpAuditEvent) {
  await db.insert(mcpAuditEvents).values(event)
}

export const MCP_AUDIT_PAGE_SIZE = 25

// Every tool call is audited, so the table is paged instead of tailing a fixed window.
export async function loadMcpAuditPage(page = 0) {
  const safePage = Math.max(0, page)
  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(mcpAuditEvents)
      .orderBy(desc(mcpAuditEvents.createdAt), desc(mcpAuditEvents.id))
      .limit(MCP_AUDIT_PAGE_SIZE)
      .offset(safePage * MCP_AUDIT_PAGE_SIZE),
    db.select({ total: count() }).from(mcpAuditEvents),
  ])
  return {
    events: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    total: Number(totals?.total ?? 0),
    page: safePage,
    pageSize: MCP_AUDIT_PAGE_SIZE,
  }
}

export async function loadMcpAdminState() {
  const [policy, audit] = await Promise.all([
    loadMcpPolicy(),
    loadMcpAuditPage(0),
  ])
  return {
    endpoint: getMcpEndpoint(getRequest()).toString(),
    policy,
    tools: MCP_TOOL_CATALOG.map((tool) => ({ ...tool })),
    audit,
  }
}
