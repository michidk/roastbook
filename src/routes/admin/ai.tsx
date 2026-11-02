import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { z } from 'zod'
import { AdminNavigation } from '@/components/admin-navigation'
import { SelectField } from '@/components/form/form-field'
import { Page, PageHeader } from '@/components/page-layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { getCurrentAccount } from '@/lib/server/account'
import { getAdminAiReport } from '@/lib/server/admin-ai'
import { AdminAiReport } from './-components/admin-ai-report'

const searchSchema = z.object({
  includeByo: z.boolean().catch(false),
  days: z.number().int().min(1).max(365).catch(30),
  cursor: z.number().int().positive().optional().catch(undefined),
})
export const Route = createFileRoute('/admin/ai')({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const account = await getCurrentAccount()
    if (account.identity?.role !== 'admin') throw redirect({ to: '/settings' })
    if (!account.providedAiAvailable)
      throw redirect({ to: '/admin/users', search: { page: 0 } })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getAdminAiReport({ data: deps }),
  component: AdminAiPage,
})

function AdminAiPage() {
  const report = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const number = useNumberFormatter()
  const date = useDateTimeFormatter()
  const busy = router.state.isLoading
  return (
    <Page>
      <PageHeader
        title="AI costs and requests"
        description="Provider spending and token usage across accounts. Estimates exclude tool fees and requests with unknown pricing."
      />
      <AdminNavigation providedAiAvailable />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border bg-card p-4">
        <SelectField
          id="admin-ai-period"
          label="Period"
          value={String(search.days)}
          options={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 90 days' },
            { value: '365', label: 'Last 365 days' },
          ]}
          onChange={(value) =>
            void router.navigate({
              to: '/admin/ai',
              search: { ...search, days: Number(value), cursor: undefined },
            })
          }
        />
        <div className="flex min-h-11 items-center gap-3">
          <Switch
            id="include-byo"
            checked={search.includeByo}
            disabled={busy}
            onCheckedChange={(includeByo) =>
              void router.navigate({
                to: '/admin/ai',
                search: { ...search, includeByo, cursor: undefined },
              })
            }
          />
          <Label htmlFor="include-byo">Include BYOAI requests</Label>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void router.invalidate()}
        >
          Refresh
        </Button>
      </div>
      <AdminAiReport report={report} />
      <section className="mt-6 space-y-4" aria-labelledby="admin-request-log">
        <h2 id="admin-request-log" className="font-display text-xl font-bold">
          Request log
        </h2>
        <p className="text-sm text-muted-foreground">
          Request metadata only. Private prompts, responses, and provider keys
          are excluded.
        </p>
        {report.logs.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            No requests in this period.
          </p>
        ) : (
          <div className="space-y-3">
            {report.logs.map((log) => (
              <article
                key={log.id}
                className="flex flex-wrap justify-between gap-3 rounded-2xl border bg-card p-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="break-all font-semibold">
                    {log.email ?? 'Deleted account'}
                  </p>
                  <p className="break-words text-sm">
                    {log.requestType} ·{' '}
                    {log.providerMode === 'provided'
                      ? 'Free · provided AI'
                      : 'BYOAI'}{' '}
                    · {log.status}
                  </p>
                  <p className="break-all text-xs text-muted-foreground">
                    {date(log.createdAt)} · {log.model}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm tabular-nums">
                  <dt>Input / output</dt>
                  <dd>
                    {number(log.promptTokens)} / {number(log.completionTokens)}
                  </dd>
                  <dt>Total tokens</dt>
                  <dd>{number(log.totalTokens)}</dd>
                  <dt>Estimated cost</dt>
                  <dd>
                    {log.estimatedCostUsd === null
                      ? 'Unknown'
                      : `$${Number(log.estimatedCostUsd).toFixed(4)}`}
                  </dd>
                </dl>
              </article>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {search.cursor ? (
            <Button
              variant="outline"
              onClick={() =>
                void router.navigate({
                  to: '/admin/ai',
                  search: { ...search, cursor: undefined },
                })
              }
            >
              Newest requests
            </Button>
          ) : null}
          {report.nextCursor ? (
            <Button
              variant="outline"
              onClick={() =>
                void router.navigate({
                  to: '/admin/ai',
                  search: { ...search, cursor: report.nextCursor ?? undefined },
                })
              }
            >
              Older requests
            </Button>
          ) : null}
        </div>
      </section>
    </Page>
  )
}
