import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import type { getAdminAiReport } from '@/lib/server/admin-ai'

type Report = Awaited<ReturnType<typeof getAdminAiReport>>
const usd = (value: number) => `$${value.toFixed(4)}`
export function AdminAiReport({ report }: { report: Report }) {
  const number = useNumberFormatter()
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ['Requests', number(report.summary.requestCount)],
          ['Input tokens', number(report.summary.promptTokens)],
          ['Output tokens', number(report.summary.completionTokens)],
          ['Total tokens', number(report.summary.totalTokens)],
          [
            'Cost',
            report.costs ? usd(report.costs.totalUsd) : 'Unavailable',
          ],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        Costs come from PostHog, which prices each AI request from its model
        and token counts
        {report.costs ? '' : ' (unavailable: check the PostHog query key)'}.
        Totals include failures and cancellations with reported usage.
      </p>
      <section
        className="rounded-2xl border bg-card p-4 sm:p-5"
        aria-labelledby="ai-daily-usage"
      >
        <h2 id="ai-daily-usage" className="font-display text-lg font-bold">
          Daily requests · UTC
        </h2>
        {report.daily.length ? (
          <div
            className="mt-4 h-64 w-full"
            role="img"
            aria-label={`Daily AI requests, ${report.summary.requestCount} requests in the selected period`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.daily}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => value.slice(5)}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  allowDecimals={false}
                  stroke="var(--muted-foreground)"
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--popover)',
                    borderColor: 'var(--border)',
                    borderRadius: 12,
                  }}
                />
                <Bar
                  dataKey="requestCount"
                  name="Requests"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            No usage yet.
          </p>
        )}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Breakdown
          title="By provider"
          rows={report.byProvider.map((row) => ({
            ...row,
            id: row.providerMode,
            costUsd: report.costs?.byProvider[row.providerMode],
            label: row.providerMode === 'provided' ? 'Provided AI' : 'BYOAI',
          }))}
        />
        <Breakdown
          title="By model · top 50 by tokens"
          rows={report.byModel.map((row) => ({
            ...row,
            id: row.model,
            costUsd: report.costs?.byModel[row.model],
            label: row.model,
          }))}
        />
      </div>
      <Breakdown
        title="By user · top 50 by tokens"
        rows={report.byUser.map((row) => ({
          ...row,
          id: row.userId,
          costUsd: report.costs?.byUser[row.userId],
          label: row.email ?? 'Deleted account',
        }))}
      />
    </div>
  )
}
function Breakdown({
  title,
  rows,
}: {
  title: string
  rows: {
    id: string
    label: string
    requestCount: number
    totalTokens: number
    costUsd?: number
  }[]
}) {
  const number = useNumberFormatter()
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      {rows.length ? (
        <ul className="divide-y">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap justify-between gap-2 py-3"
            >
              <p className="min-w-0 break-all font-medium">{row.label}</p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {number(row.requestCount)} requests · {number(row.totalTokens)}{' '}
                tokens
                {row.costUsd === undefined ? '' : ` · ${usd(row.costUsd)}`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No requests in this period.
        </p>
      )}
    </section>
  )
}
