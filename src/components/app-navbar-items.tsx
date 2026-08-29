import { Link, useRouterState } from '@tanstack/react-router'
import {
  BarChart3,
  Bean,
  BookOpen,
  Coffee,
  Cog,
  Layers,
  MapPin,
  Settings,
  SlidersHorizontal,
  Store,
  UtensilsCrossed,
} from 'lucide-react'
import type { ComponentType } from 'react'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type NavItem = {
  readonly title: string
  readonly url: string
  readonly icon: ComponentType<{ className?: string }>
}

const cafesNavItem: NavItem = {
  title: 'Cafés',
  url: '/places',
  icon: MapPin,
}

export const primaryNavItems: readonly NavItem[] = [
  { title: 'Brews', url: '/brews', icon: Coffee },
  { title: 'Beans', url: '/beans', icon: Bean },
  { title: 'Café visits', url: '/visits', icon: UtensilsCrossed },
  cafesNavItem,
]

export const moreNavItems: readonly NavItem[] = [
  { title: 'Roasters', url: '/roasters', icon: Store },
  { title: 'Gear', url: '/gear', icon: Cog },
  { title: 'Gear sets', url: '/gear-sets', icon: Layers },
  {
    title: 'Brewing methods',
    url: '/brewing-methods',
    icon: SlidersHorizontal,
  },
  { title: 'Recipes', url: '/recipes', icon: BookOpen },
  { title: 'Statistics', url: '/stats', icon: BarChart3 },
  { title: 'Settings', url: '/settings', icon: Settings },
]

export const mobilePrimaryNavItems: readonly NavItem[] = primaryNavItems.slice(
  0,
  3,
)

export const mobileMoreNavItems: readonly NavItem[] = [
  cafesNavItem,
  ...moreNavItems,
]

export const primaryCreateAction: NavItem = {
  title: 'New brew',
  url: '/brews/new',
  icon: Coffee,
}

export const createNavItems: readonly NavItem[] = [
  primaryCreateAction,
  { title: 'New bean', url: '/beans/new', icon: Bean },
  { title: 'New visit', url: '/visits/new', icon: UtensilsCrossed },
]

export function isNavItemActive(pathname: string, item: NavItem) {
  if (item.url === '/') return pathname === '/'
  // Match whole path segments so /gear does not claim /gear-sets pages.
  return pathname === item.url || pathname.startsWith(`${item.url}/`)
}

export function BrandLink({
  className,
  homePath = '/',
}: {
  readonly className?: string
  readonly homePath?: '/' | '/demo'
}) {
  return (
    <Link
      to={homePath}
      aria-label="Roastbook home"
      className={cn('flex min-h-11 shrink-0 items-center gap-2', className)}
    >
      <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl">
        <img
          src="/navbar-logo.png"
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
      {createNavItems.map((action) => (
        <DropdownMenuItem
          key={action.url}
          className="min-h-11 cursor-pointer px-3 py-2"
        >
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
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const libraryItems = items.filter(
    (item) => item.url !== '/stats' && item.url !== '/settings',
  )
  const utilityItems = items.filter(
    (item) => item.url === '/stats' || item.url === '/settings',
  )

  const renderItems = (groupItems: readonly NavItem[]) =>
    groupItems.map((item) => {
      const isActive = isNavItemActive(pathname, item)

      return (
        <DropdownMenuItem
          key={item.url}
          className={cn(
            'min-h-11 cursor-pointer gap-2.5 rounded-lg px-3 py-2 [@media(hover:hover)_and_(pointer:fine)]:min-h-9 [@media(hover:hover)_and_(pointer:fine)]:py-1.5',
            isActive && 'bg-accent text-accent-foreground',
          )}
        >
          <Link
            to={item.url}
            aria-current={isActive ? 'page' : undefined}
            className="flex w-full items-center gap-2.5"
          >
            <item.icon className="size-4 text-muted-foreground" />
            <span className="font-medium">{item.title}</span>
          </Link>
        </DropdownMenuItem>
      )
    })

  return (
    <>
      <DropdownMenuGroup>{renderItems(libraryItems)}</DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>{renderItems(utilityItems)}</DropdownMenuGroup>
    </>
  )
}
