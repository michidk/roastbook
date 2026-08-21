import { Link, useRouterState } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import type { ComponentType } from "react"
import { useTheme } from "next-themes"
import {
  Coffee,
  Bean,
  UtensilsCrossed,
  Store,
  Plus,
  BarChart3,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

type NavItem = {
  title: string
  url: string
  icon: ComponentType<{ className?: string }>
  /** Omitted from the 5-target mobile bar; reached there via its section tab. */
  desktopOnly?: boolean
}

/**
 * The top-level destinations, identical on desktop and mobile.
 *
 * Gear stays off this list and lives as a section tab on shots, since it only
 * describes them (`recipeGear.gearId`). Places are not listed either: they are
 * rendered inline on the visits page they belong to.
 */
const navItems: NavItem[] = [
  { title: "Shots", url: "/shots", icon: Coffee },
  { title: "Beans", url: "/beans", icon: Bean },
  { title: "Visits", url: "/visits", icon: UtensilsCrossed },
  { title: "Roasters", url: "/roasters", icon: Store, desktopOnly: true },
  { title: "Stats", url: "/stats", icon: BarChart3 },
]

const mobileNavItems = navItems.filter((item) => !item.desktopOnly)

/** The default action of the split create button. */
const primaryCreateAction: NavItem = {
  title: "New shot",
  url: "/shots/new",
  icon: Coffee,
}

const createActions: NavItem[] = [
  primaryCreateAction,
  { title: "New bean", url: "/beans/new", icon: Bean },
  { title: "New visit", url: "/visits/new", icon: UtensilsCrossed },
]

function isNavItemActive(pathname: string, item: NavItem) {
  return item.url === "/" ? pathname === "/" : pathname.startsWith(item.url)
}

function useThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"
  const toggle = () => setTheme(isDark ? "light" : "dark")

  return { mounted, isDark, toggle }
}

function ThemeToggleButton() {
  const { mounted, isDark, toggle } = useThemeToggle()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      disabled={!mounted}
      onClick={toggle}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

function BrandLink({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Roastbook home"
      className={cn("flex shrink-0 items-center gap-2", className)}
    >
      <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl">
        <img
          src="/roastbook-logo.png"
          alt=""
          className="size-full object-cover"
        />
      </div>
      <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
        Roastbook
      </span>
    </Link>
  )
}

function CreateMenuItems() {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Create new</DropdownMenuLabel>
      <DropdownMenuSeparator />
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

function DesktopNavLink({ item }: { item: NavItem }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isActive = isNavItemActive(pathname, item)

  return (
    <Link
      to={item.url}
      activeOptions={{ exact: item.url === "/" }}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground",
        isActive && "bg-primary text-primary-foreground"
      )}
    >
      {item.title}
    </Link>
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
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isActive = isNavItemActive(pathname, item)

  return (
    <Link
      to={item.url}
      activeOptions={{ exact: item.url === "/" }}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 text-muted-foreground transition-colors",
        isActive && "bg-primary/15 text-primary"
      )}
    >
      <div className="relative">
        <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
        {isActive && (
          <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
        )}
      </div>
      <span className="text-[11px] font-semibold">{item.title}</span>
    </Link>
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
            {navItems.map((item) => (
              <DesktopNavLink key={item.url} item={item} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggleButton />
            <DesktopCreateButton />
          </div>
        </div>
      </header>

      {/* Mobile header keeps Home off the bottom bar, so the bar stays at the
          five-target maximum. */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <BrandLink />
          <ThemeToggleButton />
        </div>
      </header>

      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="flex h-16 items-center justify-around px-1">
          {mobileNavItems.slice(0, 2).map((item) => (
            <MobileNavLink key={item.url} item={item} />
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Create new item"
              className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-primary"
            >
              <div className="-mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg">
                <Plus className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-[11px] font-semibold">New</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" sideOffset={12}>
              <CreateMenuItems />
            </DropdownMenuContent>
          </DropdownMenu>

          {mobileNavItems.slice(2).map((item) => (
            <MobileNavLink key={item.url} item={item} />
          ))}
        </div>
      </nav>
    </>
  )
}
