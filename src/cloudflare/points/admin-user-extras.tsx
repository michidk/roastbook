import { Sparkles } from 'lucide-react'
import { AdminUserAllowance } from '@/components/admin-user-allowance'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import type { AdminUser } from '@/routes/admin/-components/admin-user-actions'

function LastSignIn({ user }: { user: AdminUser }) {
  const dateTime = useDateTimeFormatter()
  return user.lastLoginAt ? dateTime(user.lastLoginAt) : 'Not recorded'
}

function Count({ value }: { value: number }) {
  return useNumberFormatter()(value)
}

function FreeAiUsage({ user }: { user: AdminUser }) {
  const number = useNumberFormatter()
  return (
    <>
      <span className="sr-only">{`${number(user.aiRequestsThisWeek)} of ${number(user.aiWeeklyLimit)} free requests used this week`}</span>
      <span aria-hidden>
        {number(user.aiRequestsThisWeek)}{' '}
        <span className="text-muted-foreground">
          / {number(user.aiWeeklyLimit)}
        </span>
      </span>
    </>
  )
}

export const adminUserColumns = [
  { id: 'last-login', header: 'Last sign-in', cell: (user: AdminUser) => <LastSignIn user={user} /> },
  { id: 'brews', header: 'Brews', align: 'right' as const, cell: (user: AdminUser) => <Count value={user.brews} /> },
  { id: 'beans', header: 'Beans', align: 'right' as const, cell: (user: AdminUser) => <Count value={user.beans} /> },
  { id: 'visits', header: 'Café visits', align: 'right' as const, cell: (user: AdminUser) => <Count value={user.visits} /> },
  {
    id: 'newsletter',
    header: 'Newsletter',
    cell: (user: AdminUser) => (user.newsletterOptIn ? 'Subscribed' : '—'),
  },
  { id: 'free-ai', header: 'Free AI this week', align: 'right' as const, cell: (user: AdminUser) => <FreeAiUsage user={user} /> },
]

export const adminUserActions = [
  {
    id: 'ai-allowance',
    label: 'Edit AI allowance',
    icon: Sparkles,
    title: 'Weekly AI allowance',
    description: (user: AdminUser) =>
      `Set the number of free AI requests available to ${user.email} each week. The allowance resets on Monday at 00:00 UTC.`,
    form: ({ user, busy, run, close }: { user: AdminUser; busy: boolean; run: (work: () => Promise<unknown>, message: string) => Promise<void>; close: () => void }) => (
      <AdminUserAllowance
        key={`${user.id}-${user.aiWeeklyLimit}`}
        userId={user.id}
        limit={user.aiWeeklyLimit}
        used={user.aiRequestsThisWeek}
        busy={busy}
        onSave={(work) => run(work, 'Weekly AI allowance updated.')}
        onCancel={close}
      />
    ),
  },
]
