import { useRouter } from '@tanstack/react-router'
import { MoreHorizontal, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  isReauthenticationCancelled,
  useReauthentication,
} from '@/components/auth/reauthentication-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { adminUserActions } from '@/extension-points/admin-user-extras'
import { deleteUser, type getUsers, setUserRole } from '@/lib/server/account'
import type { ReauthenticationAction } from '@/modules/auth/reauthentication'

export type AdminUser = Awaited<ReturnType<typeof getUsers>>['users'][number]

export function AdminUserActions({ user }: { readonly user: AdminUser }) {
  const router = useRouter()
  const actionTrigger = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<string | null>(null)
  const reauthentication = useReauthentication()

  /** Runs an admin action, first confirming it's you when it is sensitive. */
  async function action(
    work: (reauthToken: string | undefined) => Promise<unknown>,
    message: string,
    confirm?: ReauthenticationAction,
  ) {
    try {
      const reauthToken = confirm
        ? await reauthentication.confirm(confirm)
        : undefined
      setBusy(true)
      await work(reauthToken)
      await router.invalidate()
      setDialog(null)
      toast.success(message)
    } catch (error) {
      if (isReauthenticationCancelled(error)) return
      toast.error(error instanceof Error ? error.message : 'The action failed')
    } finally {
      setBusy(false)
    }
  }

  const extra = adminUserActions.find(({ id }) => id === dialog)

  return (
    <>
      {reauthentication.dialog}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            ref={actionTrigger}
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            aria-label={`Actions for ${user.email}`}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() =>
                void action(
                  (reauthToken) =>
                    setUserRole({
                      data: {
                        userId: user.id,
                        role: user.role === 'admin' ? 'user' : 'admin',
                        reauthToken,
                      },
                    }),
                  'Administrator access updated.',
                  'change-user-role',
                )
              }
            >
              {user.role === 'admin' ? (
                <ShieldOff aria-hidden />
              ) : (
                <ShieldCheck aria-hidden />
              )}
              {user.role === 'admin' ? 'Remove admin' : 'Make admin'}
            </DropdownMenuItem>
            {adminUserActions.map(({ id, label, icon: Icon }) => (
              <DropdownMenuItem key={id} onClick={() => setDialog(id)}>
                <Icon aria-hidden />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDialog('delete')}
            >
              <Trash2 aria-hidden />
              Delete user
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setDialog(null)
        }}
      >
        <DialogContent showCloseButton={!busy} finalFocus={actionTrigger}>
          <DialogHeader>
            <DialogTitle>{extra ? extra.title : 'Delete user?'}</DialogTitle>
            <DialogDescription className="break-words">
              {extra
                ? extra.description(user)
                : `Permanently delete ${user.email} and their journal, including brews, beans, café visits, and images. This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          {extra ? (
            extra.form({
              user,
              busy,
              run: action,
              close: () => setDialog(null),
            })
          ) : (
            <DialogFooter>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                aria-busy={busy}
                onClick={() =>
                  void action(
                    (reauthToken) =>
                      deleteUser({ data: { userId: user.id, reauthToken } }),
                    'User deletion started.',
                    'delete-user',
                  )
                }
              >
                {busy ? 'Deleting…' : 'Delete permanently'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
