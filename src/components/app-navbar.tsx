import { Link, useRouterState } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import type { ComponentType } from "react"
import { useTheme } from "next-themes"
import {
  Coffee,
  Bean,
  Cog,
  UtensilsCrossed,
  Home,
  MapPin,
  Store,
  Plus,
  MoreHorizontal,
  BarChart3,
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
  group: "primary" | "library"
  mobileSlot?: "main" | "more"
  addAction?: boolean
}

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: Home, group: "primary", mobileSlot: "main" },
  { title: "Shots", url: "/shots", icon: Coffee, group: "primary", mobileSlot: "main", addAction: true },
  { title: "Beans", url: "/beans", icon: Bean, group: "primary", mobileSlot: "main", addAction: true },
  { title: "Visits", url: "/visits", icon: UtensilsCrossed, group: "library", mobileSlot: "main", addAction: true },
  { title: "Places", url: "/coffee-shops", icon: MapPin, group: "library", mobileSlot: "more" },
  { title: "Gear", url: "/gear", icon: Cog, group: "library", mobileSlot: "more" },
  { title: "Roasters", url: "/roasters", icon: Store, group: "library", mobileSlot: "more" },
  { title: "Stats", url: "/stats", icon: BarChart3, group: "library", mobileSlot: "more" },
]

const primaryNav = navItems.filter((i) => i.group === "primary")
const libraryNav = navItems.filter((i) => i.group === "library")

const mobileMainNav = navItems.filter((i) => i.mobileSlot === "main")
const mobileMoreItems = navItems.filter((i) => i.mobileSlot === "more")
const addActions = navItems
  .filter((i) => i.addAction)
  .map((i) => ({ ...i, title: `New ${i.title.replace(/s$/, "")}`, url: `${i.url}/new` }))

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

function ThemeToggleMenuItem() {
  const { isDark, toggle } = useThemeToggle()

  return (
    <DropdownMenuItem className="min-h-11 px-3 py-2" onClick={toggle}>
      <span className="flex w-full items-center gap-2">
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {isDark ? "Light mode" : "Dark mode"}
      </span>
    </DropdownMenuItem>
  )
}

function DesktopNavLink({ item }: { item: NavItem }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isActive = isNavItemActive(pathname, item)

  return (
    <Link
      to={item.url}
      activeOptions={{ exact: item.url === "/" }}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground",
        isActive && "bg-primary text-primary-foreground"
      )}
    >
      {item.title}
    </Link>
  )
}

function MobileNavLink({ item }: { item: NavItem }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isActive = isNavItemActive(pathname, item)

  return (
    <Link
      to={item.url}
      activeOptions={{ exact: item.url === "/" }}
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
      <span className="text-[10px] font-semibold">{item.title}</span>
    </Link>
  )
}

function MobileMoreButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const isMoreActive = mobileMoreItems.some((item) => pathname.startsWith(item.url))
  const isMoreHighlighted = isMoreActive || isMoreOpen

  return (
    <DropdownMenu open={isMoreOpen} onOpenChange={setIsMoreOpen}>
      <DropdownMenuTrigger
        aria-label="More navigation options"
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 transition-colors",
          isMoreHighlighted ? "bg-primary/10 text-primary" : "text-muted-foreground"
        )}
      >
        <div className="relative">
          <MoreHorizontal className={cn("h-5 w-5", isMoreHighlighted && "stroke-[2.5]")} />
          {isMoreHighlighted && (
            <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
          )}
        </div>
        <span className="text-[10px] font-semibold">More</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" sideOffset={12}>
        <DropdownMenuGroup>
          {mobileMoreItems.map((item) => (
            <DropdownMenuItem key={item.title} className="min-h-11 px-3 py-2">
              <Link
                to={item.url}
                activeProps={{ className: "font-medium" }}
                className="flex w-full items-center gap-2"
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <ThemeToggleMenuItem />
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
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl">
              <img
                src="/roastbook-logo.png"
                alt="Roastbook"
                className="size-full object-cover"
              />
            </div>
            <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
              Roastbook
            </span>
          </Link>

          <nav aria-label="Main navigation" className="flex items-center gap-1 text-sm">
            {primaryNav.map((item) => (
              <DesktopNavLink key={item.title} item={item} />
            ))}
            <span className="mx-2 h-5 w-px bg-border" />
            {libraryNav.map((item) => (
              <DesktopNavLink key={item.title} item={item} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggleButton />
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  New shot
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8}>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Create new</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {addActions.map((action) => (
                    <DropdownMenuItem key={action.title}>
                      <Link to={action.url} className="flex w-full items-center gap-2">
                        <action.icon className="h-4 w-4" />
                        {action.title}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="flex h-16 items-center justify-around px-1">
          {mobileMainNav.slice(0, 2).map((item) => (
            <MobileNavLink key={item.title} item={item} />
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Create new item"
              className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-primary"
            >
              <div className="-mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg">
                <Plus className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-[10px] font-semibold">New</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" sideOffset={12}>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Create new</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {addActions.map((action) => (
                  <DropdownMenuItem key={action.title} className="min-h-11">
                    <Link to={action.url} className="flex w-full items-center gap-2">
                      <action.icon className="h-4 w-4" />
                      {action.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {mobileMainNav.slice(2).map((item) => (
            <MobileNavLink key={item.title} item={item} />
          ))}

          <MobileMoreButton />
        </div>
      </nav>
    </>
  )
}
