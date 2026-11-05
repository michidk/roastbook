import { Badge } from '@roastbook/ui/badge'
import { Button } from '@roastbook/ui/button'
import { Switch } from '@roastbook/ui/switch'
import { useRouter } from '@tanstack/react-router'
import { Activity, Bot, ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PanelSection } from '@/components/section-layout'
import { McpConnections } from '@/components/settings/mcp-connections'
import { RateLimitUsage } from '@/components/settings/rate-limit-usage'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { getErrorMessage } from '@/lib/error-message'
import {
  type getMcpAdminState,
  getMcpAuditPage,
  updateMcpPolicy,
} from '@/lib/mcp/settings'
import { cn, formatDateTime } from '@/lib/utils'

type McpAdminState = Awaited<ReturnType<typeof getMcpAdminState>>

/** Owner switches for the MCP endpoint: availability, per-tool access and recent calls. */
export function McpSettings({ state }: { readonly state: McpAdminState }) {
  const router = useRouter()
  const { demoMode } = useAppSettings()
  const isOnline = useOnlineStatus()
  const [enabled, setEnabled] = useState(state.policy.enabled)
  const [disabledTools, setDisabledTools] = useState(
    () => new Set<string>(state.policy.disabledTools),
  )
  const [saving, setSaving] = useState(false)
  const [audit, setAudit] = useState(state.audit)
  const [auditLoading, setAuditLoading] = useState(false)

  const dirty =
    enabled !== state.policy.enabled ||
    disabledTools.size !== state.policy.disabledTools.length ||
    state.policy.disabledTools.some((tool) => !disabledTools.has(tool))
  const auditPages = Math.max(1, Math.ceil(audit.total / audit.pageSize))
  const groups = [...new Set(state.tools.map((tool) => tool.group))].map(
    (group) => ({
      group,
      tools: state.tools.filter((tool) => tool.group === group),
    }),
  )

  const toggleTool = (tool: string, checked: boolean) =>
    setDisabledTools((current) => {
      const next = new Set(current)
      if (checked) next.delete(tool)
      else next.add(tool)
      return next
    })

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(state.endpoint)
      toast.success('URL copied')
    } catch {
      toast.error('Could not copy the URL. Select and copy it manually.')
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await updateMcpPolicy({
        data: { enabled, disabledTools: [...disabledTools] },
      })
      await router.invalidate()
      toast.success('AI access saved. New requests use it immediately.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Saving AI access failed'))
    } finally {
      setSaving(false)
    }
  }

  const loadAuditPage = async (page: number) => {
    setAuditLoading(true)
    try {
      setAudit(await getMcpAuditPage({ data: { page } }))
    } catch (error) {
      toast.error(getErrorMessage(error, 'Loading activity failed'))
    } finally {
      setAuditLoading(false)
    }
  }

  return (
    <>
      <PanelSection
        title="AI access (MCP)"
        description="Add this URL to your MCP client. Manage connected applications, manual tokens, and tool access below."
        action={<Bot className="size-5 text-link" />}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-sm">
            {state.endpoint}
          </code>
          <Button
            type="button"
            variant="outline"
            onClick={() => void copyEndpoint()}
          >
            <Copy aria-hidden="true" />
            Copy URL
          </Button>
        </div>
        <label
          htmlFor="mcp-enabled"
          className="flex items-center justify-between gap-4"
        >
          <span className="space-y-1">
            <span className="block font-medium">Enable MCP access</span>
            <span className="block text-sm text-muted-foreground">
              Pausing rejects MCP requests and keeps the activity history.
            </span>
          </span>
          <Switch
            id="mcp-enabled"
            checked={enabled}
            disabled={demoMode || !isOnline || saving}
            onCheckedChange={setEnabled}
          />
        </label>
      </PanelSection>

      <McpConnections grants={state.grants} credentials={state.credentials} />

      <PanelSection
        title="Tools"
        description="Disabled tools disappear from MCP discovery. Applications and tokens can use only tools allowed by both these switches and their permissions."
      >
        {groups.map(({ group, tools }) => (
          <fieldset key={group} className="space-y-1">
            <legend className="text-sm font-semibold">{group}</legend>
            <div className="divide-y divide-border">
              {tools.map((tool) => (
                <label
                  key={tool.name}
                  htmlFor={`mcp-tool-${tool.name}`}
                  className="flex min-h-11 items-start justify-between gap-3 py-3"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {tool.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {tool.description}
                    </span>
                    <code className="block truncate font-mono text-xs text-link">
                      {tool.name}
                    </code>
                  </span>
                  <Switch
                    id={`mcp-tool-${tool.name}`}
                    checked={!disabledTools.has(tool.name)}
                    disabled={demoMode || !isOnline || saving}
                    onCheckedChange={(checked) =>
                      toggleTool(tool.name, checked)
                    }
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <Button
          type="button"
          disabled={demoMode || !isOnline || saving || !dirty}
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : 'Save AI access'}
        </Button>
      </PanelSection>

      <RateLimitUsage rateLimit={state.rateLimit} />

      <PanelSection
        title="Recent activity"
        action={<Activity className="size-5 text-link" />}
      >
        {audit.total === 0 ? (
          <p className="text-sm text-muted-foreground">No MCP activity yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Tool</th>
                    <th className="py-2">Outcome</th>
                  </tr>
                </thead>
                <tbody
                  className={cn(
                    'divide-y divide-border',
                    auditLoading && 'opacity-60',
                  )}
                >
                  {audit.events.map((event) => (
                    <tr key={event.id}>
                      <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs">
                        {formatDateTime(event.createdAt)}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {event.toolName ?? '—'}
                      </td>
                      <td className="py-2">
                        <Badge
                          variant={
                            event.outcome === 'success'
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {event.outcome}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {auditPages > 1 ? (
              <div className="flex items-center justify-between gap-3">
                <p aria-live="polite" className="text-xs text-muted-foreground">
                  {audit.page * audit.pageSize + 1}–
                  {Math.min(audit.total, (audit.page + 1) * audit.pageSize)} of{' '}
                  {audit.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={audit.page === 0 || auditLoading}
                    onClick={() => void loadAuditPage(audit.page - 1)}
                  >
                    <ChevronLeft aria-hidden="true" /> Newer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={audit.page + 1 >= auditPages || auditLoading}
                    onClick={() => void loadAuditPage(audit.page + 1)}
                  >
                    Older <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </PanelSection>
    </>
  )
}
