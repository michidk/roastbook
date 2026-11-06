import { Badge } from '@roastbook/ui/badge'
import { Button } from '@roastbook/ui/button'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { MetricCard } from '@/components/metric-card'
import { PanelPending } from '@/components/route-pending'
import { PanelSection } from '@/components/section-layout'
import { adminUserColumns } from '@/extension-points/admin-user-extras'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { getUser } from '@/lib/server/account'
import { AdminUserActions } from '../-components/admin-user-actions'

export const Route = createFileRoute('/admin/users_/$userId')({
  pendingComponent: PanelPending,
  loader: ({ params }) => getUser({ data: { userId: params.userId } }),
  component: UserPage,
})

function UserPage() {
  const { user, passkeys, activeSessions, integrationTokens, usage, ai } =
    Route.useLoaderData()
  const dateTime = useDateTimeFormatter()
  const number = useNumberFormatter()
  const when = (value: Date | string | null) =>
    value ? dateTime(value) : 'Never'

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        render={<Link to="/admin/users" search={{ page: 0 }} />}
      >
        <ArrowLeft aria-hidden />
        All users
      </Button>
      <PanelSection
        title={user.email}
        description="Account details, agreements, sign-in, and usage."
        action={user.deletingAt ? undefined : <AdminUserActions user={user} />}
      >
        <Details
          rows={[
            [
              'Role',
              <Badge
                key="role"
                variant={user.role === 'admin' ? 'default' : 'outline'}
              >
                {user.role === 'admin' ? 'Admin' : 'User'}
              </Badge>,
            ],
            [
              'Status',
              user.deletingAt
                ? `Deleting since ${dateTime(user.deletingAt)}`
                : 'Active',
            ],
            ['Signed up', dateTime(user.createdAt)],
            ['Last sign-in', when(user.lastLoginAt)],
            ['Email verified', user.emailVerified ? 'Yes' : 'No'],
            ['Journal created', when(user.journalInitializedAt)],
            ...adminUserColumns
              .filter(({ listOnly }) => !listOnly)
              .map(({ header, cell }) => [header, cell(user)] as const),
          ]}
        />
      </PanelSection>
      <PanelSection title="Agreements">
        <Details
          rows={[
            [
              'Terms of Service',
              user.termsAcceptedAt
                ? `Version ${user.termsVersion ?? 'unknown'}, accepted ${dateTime(user.termsAcceptedAt)}`
                : 'Not accepted',
            ],
            [
              'Newsletter',
              user.newsletterOptIn ? 'Subscribed' : 'Not subscribed',
            ],
          ]}
        />
      </PanelSection>
      <PanelSection title="Sign-in">
        <Details
          rows={[
            ['Methods', passkeys.length ? 'Email code, passkey' : 'Email code'],
            [
              'Passkeys',
              passkeys.length ? (
                <ul key="passkeys" className="space-y-1">
                  {passkeys.map((passkey) => (
                    <li key={`${passkey.name}-${String(passkey.createdAt)}`}>
                      {passkey.name || 'Unnamed passkey'}
                      <span className="text-muted-foreground">
                        {' · '}
                        {passkey.backedUp ? 'synced' : 'this device only'}
                        {passkey.createdAt
                          ? ` · added ${dateTime(passkey.createdAt)}`
                          : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                'None'
              ),
            ],
            ['Active sessions', number(activeSessions)],
            ['Integration tokens', number(integrationTokens)],
          ]}
        />
      </PanelSection>
      <PanelSection title="Usage">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ['Brews', usage.brews],
              ['Beans', usage.beans],
              ['Bean purchases', usage.purchases],
              ['Café visits', usage.visits],
              ['Cafés', usage.cafes],
              ['Roasters', usage.roasters],
              ['Gear', usage.gear],
              ['Recipes', usage.recipes],
            ] as const
          ).map(([label, value]) => (
            <MetricCard
              key={label}
              label={label}
              value={number(value)}
              variant="quiet"
            />
          ))}
        </div>
        <Details
          rows={[
            [
              'AI requests',
              `${number(ai.requestsLast30Days)} in the last 30 days, ${number(ai.requests)} in total`,
            ],
            ['AI tokens', number(ai.tokens)],
            ['Last AI request', when(ai.lastRequestAt)],
          ]}
        />
      </PanelSection>
    </div>
  )
}

function Details({
  rows,
}: {
  readonly rows: readonly (readonly [string, ReactNode])[]
}) {
  return (
    <dl className="mt-4 divide-y divide-border rounded-xl border border-border text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4"
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
