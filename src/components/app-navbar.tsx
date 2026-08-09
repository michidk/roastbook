import { Link, useRouterState } from "@tanstack/react-router"
import { ChevronDown, Ellipsis, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  BrandLink,
  CreateMenuItems,
  isNavItemActive,
  MoreMenuItems,
  moreNavItems,
  primaryCreateAction,
  primaryNavItems,
} from "@/components/app-navbar-items"
import type { NavItem } from "@/components/app-navbar-items"
import type { ReactNode } from "react"

function useNavItemIsActive(item: NavItem): boolean {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return isNavItemActive(pathname, item)
}

function useMoreNavIsActive(): boolean {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return moreNavItems.some((item) => isNavItemActive(pathname, item))
}

function NavItemLink({
  item,
  isActive,
  className,
  activeClassName,
  children,
}: {
  readonly item: NavItem
  readonly isActive: boolean
  readonly className: string
  readonly activeClassName: string
  readonly children: ReactNode
}) {
  return (
    <Link
      to={item.url}
      activeOptions={{ exact: item.url === "/" }}
      aria-current={isActive ? "page" : undefined}
      className={cn(className, isActive && activeClassName)}
    >
      {children}
    </Link>
  )
}

function DesktopNavLink({ item }: { item: NavItem }) {
  const isActive = useNavItemIsActive(item)

  return (
    <NavItemLink
      item={item}
      isActive={isActive}
      className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      activeClassName="bg-primary text-primary-foreground"
    >
      {item.title}
    </NavItemLink>
  )
}

function DesktopMoreMenu() {
  const isActive = useMoreNavIsActive()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="More navigation"
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground",
          isActive && "bg-primary text-primary-foreground",
        )}
      >
        More
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8}>
        <MoreMenuItems items={moreNavItems} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Primary action plus a caret for the rest, so the visible label always
 * describes what a plain click does.
 */
function DesktopCreateButton() {
  return (
    <div className="flex items-center">
      <Button asChild className="gap-1.5 rounded-r-none">
        <Link to={primaryCreateAction.url}>
          <Plus className="h-4 w-4" />
          {primaryCreateAction.title}
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            aria-label="More create options"
            className="rounded-l-none border-l border-ink-foreground/25 px-2.5"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8}>
          <CreateMenuItems />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function MobileNavLink({ item }: { item: NavItem }) {
  const isActive = useNavItemIsActive(item)

  return (
    <NavItemLink
      item={item}
      isActive={isActive}
      className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 text-muted-foreground transition-colors"
      activeClassName="bg-accent text-foreground"
    >
      <div className="relative">
        <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
        {isActive && (
          <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
        )}
      </div>
      <span className="text-[10px] font-semibold">{item.title}</span>
    </NavItemLink>
  )
}

function MobileMoreMenu() {
  const isActive = useMoreNavIsActive()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="More navigation"
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 text-muted-foreground transition-colors",
          isActive && "bg-accent text-foreground",
        )}
      >
        <div className="relative">
          <Ellipsis className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
          {isActive && (
            <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
          )}
        </div>
        <span className="text-[10px] font-semibold">More</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" sideOffset={12}>
        <MoreMenuItems items={moreNavItems} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppNavbar() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:left-4 focus:top-4 focus:rounded-md focus:border focus:bg-background focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 hidden w-full border-b border-border bg-card lg:block">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-6 px-6">
          <BrandLink />

          <nav aria-label="Main navigation" className="flex items-center gap-1 text-sm">
            {primaryNavItems.map((item) => (
              <DesktopNavLink key={item.url} item={item} />
            ))}
            <DesktopMoreMenu />
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <DesktopCreateButton />
          </div>
        </div>
      </header>

      {/* Mobile header keeps Home off the bottom bar, so the bar stays at the
          five-target maximum. */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card lg:hidden">
        <div className="flex h-14 items-center px-4">
          <BrandLink />
        </div>
      </header>

      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="flex h-16 items-center justify-around px-1">
          {primaryNavItems.slice(0, 2).map((item) => (
            <MobileNavLink key={item.url} item={item} />
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Create new item"
              className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-foreground"
            >
              <div className="-mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg">
                <Plus className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-[10px] font-semibold">New</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" sideOffset={12}>
              <CreateMenuItems />
            </DropdownMenuContent>
          </DropdownMenu>

          {primaryNavItems.slice(2).map((item) => (
            <MobileNavLink key={item.url} item={item} />
          ))}
          <MobileMoreMenu />
        </div>
      </nav>
    </>
  )
}
