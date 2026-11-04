import {
  createFileRoute,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { PanelSection } from '@/components/section-layout'
import { Button } from '@/components/ui/button'
import { AdminUsersTable } from '@/extension-points/admin-users-table'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { getUsers } from '@/lib/server/account'

export const Route = createFileRoute('/admin/users')({
  validateSearch: (search: Record<string, unknown>) => ({
    page:
      typeof search.page === 'number' &&
      Number.isInteger(search.page) &&
      search.page >= 0 &&
      search.page <= 10000
        ? search.page
        : 0,
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ deps }) => getUsers({ data: deps }),
  component: UsersPage,
})

function UsersPage() {
  const state = Route.useLoaderData()
  const router = useRouter()
  const loading = useRouterState({ select: (state) => state.isLoading })
  const number = useNumberFormatter()
  const first = state.users.length ? state.page * 50 + 1 : 0
  const last = state.page * 50 + state.users.length

  return (
    <PanelSection
      title="Users"
      description="Manage accounts and administrator access."
    >
      <AdminUsersTable users={state.users} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {state.users.length
            ? `${number(first)}–${number(last)} of ${number(state.total)} users`
            : `${number(state.total)} users`}
        </p>
        <div className="flex gap-2">
          <Button
            disabled={state.page === 0 || loading}
            variant="outline"
            size="sm"
            onClick={() =>
              void router.navigate({
                to: '/admin/users',
                search: { page: state.page - 1 },
              })
            }
          >
            Previous
          </Button>
          <Button
            disabled={(state.page + 1) * 50 >= state.total || loading}
            variant="outline"
            size="sm"
            onClick={() =>
              void router.navigate({
                to: '/admin/users',
                search: { page: state.page + 1 },
              })
            }
          >
            Next
          </Button>
        </div>
      </div>
    </PanelSection>
  )
}
