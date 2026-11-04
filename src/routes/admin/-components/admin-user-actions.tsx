import { useRouter } from '@tanstack/react-router'
import {
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { AdminUserAllowance } from '@/components/admin-user-allowance'
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
import { deleteUser, type getUsers, setUserRole } from '@/lib/server/account'

export type AdminUser = Awaited<ReturnType<typeof getUsers>>['users'][number]

export function AdminUserActions({
  user,
  providedAiAvailable,
}: {
  readonly user: AdminUser
  readonly providedAiAvailable: boolean
}) {
  const router = useRouter()
  const actionTrigger = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<'delete' | 'allowance' | null>(null)

  async function action(work: () => Promise<unknown>, message: string) {
    setBusy(true)
    try {
      await work()
      await router.invalidate()
      setDialog(null)
      toast.success(message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
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
                  () =>
                    setUserRole({
                      data: {
                        userId: user.id,
                        role: user.role === 'admin' ? 'user' : 'admin',
                      },
                    }),
                  'Administrator access updated.',
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
            {providedAiAvailable ? (
              <DropdownMenuItem onClick={() => setDialog('allowance')}>
                <Sparkles aria-hidden />
                Edit AI allowance
              </DropdownMenuItem>
            ) : null}
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
            <DialogTitle>
              {dialog === 'delete' ? 'Delete user?' : 'Weekly AI allowance'}
            </DialogTitle>
            <DialogDescription className="break-words">
              {dialog === 'delete'
                ? `Permanently delete ${user.email} and their journal, including brews, beans, café visits, and images. This cannot be undone.`
                : `Set the number of free AI requests available to ${user.email} each week. The allowance resets on Monday at 00:00 UTC.`}
            </DialogDescription>
          </DialogHeader>
          {dialog === 'allowance' ? (
            <AdminUserAllowance
              key={`${user.id}-${user.aiWeeklyLimit}`}
              userId={user.id}
              limit={user.aiWeeklyLimit}
              used={user.aiRequestsThisWeek}
              busy={busy}
              onSave={(work) => action(work, 'Weekly AI allowance updated.')}
              onCancel={() => setDialog(null)}
            />
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
                    () => deleteUser({ data: { userId: user.id } }),
                    'User deletion started.',
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
