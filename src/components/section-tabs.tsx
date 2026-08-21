import { Link, useRouterState } from "@tanstack/react-router"
import type { ComponentType } from "react"
import { Bean, Coffee, Cog, Store } from "lucide-react"
import { cn } from "@/lib/utils"

export type SectionTab = {
  title: string
  url: string
  icon: ComponentType<{ className?: string }>
}

/**
 * Shots and the equipment used to pull them (`shots.recipeId` ->
 * `recipeGear.gearId`). Gear is set-up-once data, so it sits beside shots
 * rather than in the main navigation.
 */
export const shotsTabs: SectionTab[] = [
  { title: "Shots", url: "/shots", icon: Coffee },
  { title: "Gear", url: "/gear", icon: Cog },
]

/**
 * Beans and the roaster catalog that categorizes them (`beans.roasterId`).
 * Roasters exist only to group beans, so they belong next to beans rather than
 * as a competing top-level destination.
 */
export const beansTabs: SectionTab[] = [
  { title: "Beans", url: "/beans", icon: Bean },
  { title: "Roasters", url: "/roasters", icon: Store },
]

/**
 * Segmented control for sibling routes within one section.
 *
 * These are links rather than ARIA tabs: every entry is its own route, so
 * `role="tablist"` would promise in-page panels that never appear. The active
 * entry is raised out of a recessed track rather than filled with the primary
 * colour, so it stays visually subordinate to the top-level navigation.
 */
export function SectionTabs({ tabs, label }: { tabs: SectionTab[]; label: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <nav
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary p-1"
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.url || pathname.startsWith(`${tab.url}/`)

        return (
          <Link
            key={tab.url}
            to={tab.url}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.title}
          </Link>
        )
      })}
    </nav>
  )
}
