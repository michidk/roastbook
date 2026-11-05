import { journalInsertValues, owned } from '@/db/journal-scope.server'
import '@tanstack/react-start/server-only'

import { getRequest } from '@tanstack/react-start/server'
import { count, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { mcpAuditEvents, mcpSettings } from '@/db/schema'
import { DEMO_MODE } from '@/lib/build-mode'
import { getServerEnv } from '@/lib/env.server'
import { INTEGRATION_RESOURCES } from '@/modules/integrations/scopes'
import { listOAuthGrants } from '../auth/oauth-grants.server'
import {
  INTEGRATION_OPERATION_NAMES,
  INTEGRATION_OPERATIONS,
} from '../integrations/operations.server'
import { loadIntegrationSettings } from '../integrations/settings.server'
import { getMcpEndpoint } from './config.server'

export type McpPolicy = {
  enabled: boolean
  disabledTools: string[]
}

const DEFAULT_POLICY: McpPolicy = { enabled: true, disabledTools: [] }

function knownDisabledTools(values: readonly string[]) {
  const known = new Set<string>(INTEGRATION_OPERATION_NAMES)
  return values.filter((value) => known.has(value))
}

export async function loadMcpPolicy(): Promise<McpPolicy> {
  const [row] = await db
    .select({
      enabled: mcpSettings.enabled,
      disabledTools: mcpSettings.disabledTools,
    })
    .from(mcpSettings)
    .where(owned(mcpSettings, eq(mcpSettings.id, 'instance')))
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
    .values(
      journalInsertValues({
        id: 'instance',
        enabled: policy.enabled,
        disabledTools,
      }),
    )
    .onConflictDoUpdate({
      target: [mcpSettings.ownerId, mcpSettings.id],
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
  await db.insert(mcpAuditEvents).values(journalInsertValues(event))
}

export const MCP_AUDIT_PAGE_SIZE = 25

// Every tool call is audited, so the table is paged instead of tailing a fixed window.
export async function loadMcpAuditPage(page = 0) {
  const safePage = Math.max(0, page)
  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(mcpAuditEvents)
      .where(owned(mcpAuditEvents))
      .orderBy(desc(mcpAuditEvents.createdAt), desc(mcpAuditEvents.id))
      .limit(MCP_AUDIT_PAGE_SIZE)
      .offset(safePage * MCP_AUDIT_PAGE_SIZE),
    db
      .select({ total: count() })
      .from(mcpAuditEvents)
      .where(owned(mcpAuditEvents)),
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

const resourceLabel = (id: string) =>
  INTEGRATION_RESOURCES.find((resource) => resource.id === id)?.label ??
  'Pictures'

export async function loadMcpAdminState() {
  const [policy, audit, grants] = await Promise.all([
    loadMcpPolicy(),
    loadMcpAuditPage(0),
    DEMO_MODE ? [] : listOAuthGrants(),
  ])
  const access = await loadIntegrationSettings(
    'mcp',
    grants.map((grant) => `oauth:${grant.clientId}`),
  )
  return {
    endpoint: getMcpEndpoint(
      getServerEnv().PUBLIC_URL ?? getRequest(),
    ).toString(),
    policy,
    tools: INTEGRATION_OPERATIONS.map((operation) => ({
      name: operation.name,
      title: operation.title,
      description: operation.description,
      access: operation.access,
      group:
        operation.resources.length === 1
          ? resourceLabel(operation.resources[0] ?? '')
          : 'Pictures',
    })),
    audit,
    grants: grants.map((grant) => ({
      ...grant,
      requestsToday: access.requestsToday[`oauth:${grant.clientId}`] ?? 0,
    })),
    ...access,
  }
}
