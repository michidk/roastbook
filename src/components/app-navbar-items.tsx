import { Link } from '@tanstack/react-router'
import {
  BarChart3,
  Bean,
  BookOpen,
  Coffee,
  Cog,
  Settings,
  SlidersHorizontal,
  Store,
  UtensilsCrossed,
} from 'lucide-react'
import type { ComponentType } from 'react'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type NavItem = {
  readonly title: string
  readonly url: string
  readonly icon: ComponentType<{ className?: string }>
}

export const primaryNavItems: readonly NavItem[] = [
  { title: 'Shots', url: '/shots', icon: Coffee },
  { title: 'Beans', url: '/beans', icon: Bean },
  { title: 'Visits', url: '/visits', icon: UtensilsCrossed },
]

export const moreNavItems: readonly NavItem[] = [
  { title: 'Roasters', url: '/roasters', icon: Store },
  { title: 'Gear', url: '/gear', icon: Cog },
  {
    title: 'Brewing methods',
    url: '/brewing-methods',
    icon: SlidersHorizontal,
  },
  { title: 'Recipes', url: '/recipes', icon: BookOpen },
  { title: 'Stats', url: '/stats', icon: BarChart3 },
  { title: 'Settings', url: '/settings', icon: Settings },
]

export const primaryCreateAction: NavItem = {
  title: 'New shot',
  url: '/shots/new',
  icon: Coffee,
}

const createActions: readonly NavItem[] = [
  primaryCreateAction,
  { title: 'New bean', url: '/beans/new', icon: Bean },
  { title: 'New visit', url: '/visits/new', icon: UtensilsCrossed },
]

export function isNavItemActive(pathname: string, item: NavItem) {
  return item.url === '/' ? pathname === '/' : pathname.startsWith(item.url)
}

export function BrandLink({ className }: { readonly className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Roastbook home"
      className={cn('flex shrink-0 items-center gap-2', className)}
    >
      <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl">
        <img
          src="/roastbook-logo.png"
          alt=""
          width={36}
          height={36}
          className="size-full object-cover"
        />
      </div>
      <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
        Roastbook
      </span>
    </Link>
  )
}

export function CreateMenuItems() {
  return (
    <DropdownMenuGroup>
      {createActions.map((action) => (
        <DropdownMenuItem key={action.url} className="min-h-11 px-3 py-2">
          <Link to={action.url} className="flex w-full items-center gap-2">
            <action.icon className="h-4 w-4" />
            {action.title}
          </Link>
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  )
}

export function MoreMenuItems({
  items,
}: {
  readonly items: readonly NavItem[]
}) {
  return (
    <DropdownMenuGroup>
      {items.map((item) => (
        <DropdownMenuItem key={item.url} className="min-h-11 px-3 py-2">
          <Link to={item.url} className="flex w-full items-center gap-2">
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  )
}
