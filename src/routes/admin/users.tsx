import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Page, PageHeader } from '@/components/page-layout'
import { Button } from '@/components/ui/button'
import {
  deleteUser,
  getCurrentAccount,
  getUsers,
  setUserRole,
} from '@/lib/server/account'

export const Route = createFileRoute('/admin/users')({
  validateSearch: (search: Record<string, unknown>) => ({
    page:
      typeof search.page === 'number' &&
      Number.isInteger(search.page) &&
      search.page >= 0
        ? search.page
        : 0,
  }),
  beforeLoad: async () => {
    const account = await getCurrentAccount()
    if (account.identity?.role !== 'admin') throw redirect({ to: '/settings' })
  },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ deps }) => getUsers({ data: deps }),
  component: UsersPage,
})
function UsersPage() {
  const state = Route.useLoaderData(),
    router = useRouter()
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  async function action(work: () => Promise<unknown>) {
    setBusy(true)
    try {
      await work()
      setDeleting(null)
      await router.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The action failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Page>
      <PageHeader
        title="Users"
        description="Manage accounts and administrator access."
      />
      <div className="space-y-4">
        {state.users.map((user) => (
          <div
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
          >
            <div>
              <p className="break-all text-sm text-muted-foreground">
                {user.email}
              </p>
              <p className="text-sm">
                {user.deletingAt ? 'Deletion in progress' : user.role}
              </p>
            </div>
            {user.deletingAt ? null : (
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() =>
                    void action(() =>
                      setUserRole({
                        data: {
                          userId: user.id,
                          role: user.role === 'admin' ? 'user' : 'admin',
                        },
                      }),
                    )
                  }
                >
                  {user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                </Button>
                {deleting === user.id ? (
                  <>
                    <Button
                      disabled={busy}
                      variant="destructive"
                      onClick={() =>
                        void action(() =>
                          deleteUser({ data: { userId: user.id } }),
                        )
                      }
                    >
                      Confirm permanent deletion
                    </Button>
                    <Button variant="outline" onClick={() => setDeleting(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    disabled={busy}
                    variant="destructive"
                    onClick={() => setDeleting(user.id)}
                  >
                    Delete user
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between gap-3">
          <Button
            disabled={state.page === 0}
            variant="outline"
            onClick={() =>
              void router.navigate({
                to: '/admin/users',
                search: { page: state.page - 1 },
              })
            }
          >
            Previous
          </Button>
          <span>{state.total} users</span>
          <Button
            disabled={(state.page + 1) * 50 >= state.total}
            variant="outline"
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
    </Page>
  )
}
