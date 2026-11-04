import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useDateFormatter,
  useDateTimeFormatter,
} from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { type AdminUser, AdminUserActions } from './admin-user-actions'

export function AdminUsersTable({
  users,
  providedAiAvailable,
}: {
  readonly users: readonly AdminUser[]
  readonly providedAiAvailable: boolean
}) {
  const date = useDateFormatter()
  const dateTime = useDateTimeFormatter()
  const number = useNumberFormatter()
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border">
      <Table>
        <TableCaption className="sr-only">
          User accounts, roles, last sign-in, journal counts, and account
          actions.
        </TableCaption>
        <TableHeader>
          <TableRow className="bg-secondary/40 hover:bg-secondary/40">
            <TableHead scope="col" className="pl-4">
              Account
            </TableHead>
            <TableHead scope="col">Role</TableHead>
            <TableHead scope="col">Last sign-in</TableHead>
            <TableHead scope="col" className="text-right">
              Brews
            </TableHead>
            <TableHead scope="col" className="text-right">
              Beans
            </TableHead>
            <TableHead scope="col" className="text-right">
              Café visits
            </TableHead>
            {providedAiAvailable ? (
              <TableHead scope="col" className="text-right">
                Free AI this week
              </TableHead>
            ) : null}
            <TableHead scope="col" className="pr-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length ? (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="py-3 pl-4">
                  <p
                    className="max-w-64 truncate font-medium"
                    title={user.email}
                  >
                    {user.email}
                  </p>
                  <p
                    className="mt-0.5 text-xs text-muted-foreground"
                    title={dateTime(user.createdAt)}
                  >
                    Joined {date(user.createdAt)}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      user.deletingAt
                        ? 'secondary'
                        : user.role === 'admin'
                          ? 'default'
                          : 'outline'
                    }
                  >
                    {user.deletingAt ? (
                      'Deleting'
                    ) : user.role === 'admin' ? (
                      <>
                        <ShieldCheck aria-hidden />
                        Admin
                      </>
                    ) : (
                      'User'
                    )}
                  </Badge>
                </TableCell>
                <TableCell
                  className="text-muted-foreground"
                  title={
                    user.lastLoginAt ? dateTime(user.lastLoginAt) : undefined
                  }
                >
                  {user.lastLoginAt
                    ? dateTime(user.lastLoginAt)
                    : 'Not recorded'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {number(user.brews)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {number(user.beans)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {number(user.visits)}
                </TableCell>
                {providedAiAvailable ? (
                  <TableCell className="text-right tabular-nums">
                    <span className="sr-only">{`${number(user.aiRequestsThisWeek)} of ${number(user.aiWeeklyLimit)} free requests used this week`}</span>
                    <span aria-hidden>
                      {number(user.aiRequestsThisWeek)}{' '}
                      <span className="text-muted-foreground">
                        / {number(user.aiWeeklyLimit)}
                      </span>
                    </span>
                  </TableCell>
                ) : null}
                <TableCell className="pr-3 text-right">
                  {user.deletingAt ? (
                    <span className="sr-only">Deletion in progress</span>
                  ) : (
                    <AdminUserActions
                      user={user}
                      providedAiAvailable={providedAiAvailable}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={providedAiAvailable ? 8 : 7}
                className="py-12 text-center text-muted-foreground"
              >
                No users on this page.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
