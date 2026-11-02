import { Link } from '@tanstack/react-router'
import {
  LoaderCircle,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AppSettings } from '@/lib/app-settings'
import { signOutOfAccount } from '@/lib/sign-out'

export function AccountMenu({
  account,
}: {
  readonly account: NonNullable<AppSettings['account']>
}) {
  const [image, setImage] = useState<{ email: string; url: string } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const email = account.email

  useEffect(() => {
    let cancelled = false
    async function loadAvatar() {
      const hash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(email.trim().toLowerCase()),
      )
      const digest = Array.from(new Uint8Array(hash), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('')
      if (!cancelled)
        setImage({
          email,
          url: `https://www.gravatar.com/avatar/${digest}?s=80&d=404&r=g`,
        })
    }
    void loadAvatar().catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [email])

  async function signOut() {
    if (busy) return
    setBusy(true)
    try {
      await signOutOfAccount()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not sign out.',
      )
      setBusy(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Account menu"
          aria-busy={busy}
          disabled={busy}
          className="rounded-full p-1"
        >
          <Avatar className="size-8">
            <AvatarImage
              src={image?.email === email ? image.url : undefined}
              alt=""
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
            />
            <AvatarFallback className="bg-secondary font-display font-bold text-coffee">
              {email.trim().slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 max-w-[calc(100vw-2rem)]"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2">
            <span className="block text-xs font-normal text-muted-foreground">
              Signed in as
            </span>
            <span
              className="mt-1 block truncate text-sm font-medium text-foreground"
              title={email}
            >
              {email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Link to="/settings/account">
              <UserRound aria-hidden />
              Account settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link to="/settings">
              <Settings aria-hidden />
              Settings
            </Link>
          </DropdownMenuItem>
          {account.role === 'admin' ? (
            <DropdownMenuItem>
              <Link to="/admin/users" search={{ page: 0 }}>
                <ShieldCheck aria-hidden />
                Manage users
              </Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={busy}
            closeOnClick={false}
            onClick={() => void signOut()}
          >
            {busy ? (
              <LoaderCircle
                aria-hidden
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <LogOut aria-hidden />
            )}
            {busy ? 'Signing out…' : 'Sign out'}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
