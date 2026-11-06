import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@roastbook/ui/table'
import { Link } from '@tanstack/react-router'
import { ShieldCheck } from 'lucide-react'
import { adminUserColumns } from '@/extension-points/admin-user-extras'
import {
  useDateFormatter,
  useDateTimeFormatter,
} from '@/hooks/use-date-formatter'
import { type AdminUser, AdminUserActions } from './admin-user-actions'

export function AdminUsersTable({
  users,
}: {
  readonly users: readonly AdminUser[]
}) {
  const date = useDateFormatter()
  const dateTime = useDateTimeFormatter()
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border">
      <Table>
        <TableCaption className="sr-only">
          User accounts, roles, and account actions.
        </TableCaption>
        <TableHeader>
          <TableRow className="bg-secondary/40 hover:bg-secondary/40">
            <TableHead scope="col" className="pl-4">
              Account
            </TableHead>
            {adminUserColumns.map(({ id, header, align }) => (
              <TableHead
                key={id}
                scope="col"
                className={align === 'right' ? 'text-right' : undefined}
              >
                {header}
              </TableHead>
            ))}
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
                  <div className="flex items-center gap-1.5">
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: user.id }}
                      className="max-w-64 truncate font-medium underline-offset-4 hover:underline"
                      title={user.email}
                    >
                      {user.email}
                    </Link>
                    {user.role === 'admin' ? (
                      <ShieldCheck
                        role="img"
                        aria-label="Admin"
                        className="size-4 shrink-0 text-link"
                      >
                        <title>Admin</title>
                      </ShieldCheck>
                    ) : null}
                  </div>
                  <p
                    className="mt-0.5 text-xs text-muted-foreground"
                    title={dateTime(user.createdAt)}
                  >
                    Joined {date(user.createdAt)}
                    {user.deletingAt ? ' · Deleting' : ''}
                  </p>
                </TableCell>
                {adminUserColumns.map(({ id, align, cell }) => (
                  <TableCell
                    key={id}
                    className={
                      align === 'right'
                        ? 'text-right tabular-nums'
                        : 'text-muted-foreground'
                    }
                  >
                    {cell(user)}
                  </TableCell>
                ))}
                <TableCell className="pr-3 text-right">
                  {user.deletingAt ? (
                    <span className="sr-only">Deletion in progress</span>
                  ) : (
                    <AdminUserActions user={user} />
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={2 + adminUserColumns.length}
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
