import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus, Bean, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getBeans } from "@/lib/server/beans"
import { RouteError } from "@/components/route-error"
import { ListPending } from "@/components/route-pending"
import { EmptyState } from "@/components/EmptyState"
import { thumbnailUrl } from "@/lib/image-url"

export const Route = createFileRoute("/beans/")({
  loader: () => getBeans(),
  component: BeansPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

type Bean = Awaited<ReturnType<typeof getBeans>>[number]

const roastGradients: Record<string, [string, string]> = {
  light: ["#dba673", "#a06a3e"],
  medium_light: ["#c4924f", "#7a5230"],
  medium: ["#b07a45", "#6f4e37"],
  medium_dark: ["#9a5e30", "#523019"],
  dark: ["#7a4e2e", "#3f2614"],
}

const roastBadgeStyles: Record<string, { bg: string; fg: string; label: string }> = {
  light: { bg: "#f6e8d4", fg: "#a26a30", label: "Light" },
  medium_light: { bg: "#f3e4d0", fg: "#8a5a30", label: "Medium-light" },
  medium: { bg: "#f3e4d0", fg: "#8a5a30", label: "Medium" },
  medium_dark: { bg: "#e7d2bc", fg: "#5c3a22", label: "Medium-dark" },
  dark: { bg: "#dac0a4", fg: "#42261a", label: "Dark" },
}

function BeansPage() {
  const beans = Route.useLoaderData()
  const activeBeans = beans.filter((b) => !b.isArchived)
  const archivedBeans = beans.filter((b) => b.isArchived)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Beans
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Your coffee bean collection
          </p>
        </div>
        <Button asChild>
          <Link to="/beans/new">
            <Plus className="h-4 w-4" />
            Add beans
          </Link>
        </Button>
      </header>

      {beans.length === 0 ? (
        <EmptyState
          icon={Bean}
          title="No beans added yet"
          description="Start by adding your first bag of coffee"
          actionLabel="Add beans"
          actionHref="/beans/new"
        />
      ) : (
        <>
          {activeBeans.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Active · {activeBeans.length}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {activeBeans.map((bean) => (
                  <BeanCard key={bean.id} bean={bean} />
                ))}
              </div>
            </section>
          )}

          {activeBeans.length === 0 && archivedBeans.length > 0 && (
            <p className="text-sm text-muted-foreground">
              No active beans. Check the archived section below.
            </p>
          )}

          {archivedBeans.length > 0 && (
            <Collapsible className="space-y-4">
              <CollapsibleTrigger className="group flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground">
                <ChevronDown className="h-4 w-4 transition-transform group-data-[open]:rotate-180" />
                Archived ({archivedBeans.length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedBeans.map((bean) => (
                    <BeanCard key={bean.id} bean={bean} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  )
}

function BeanCard({ bean }: { bean: Bean }) {
  const thumbnail = bean.images.find((img) => img.isThumbnail) ?? bean.images[0]
  const baseUrl = import.meta.env.VITE_STORAGE_URL || "/uploads"
  const gradient =
    bean.roastLevel && roastGradients[bean.roastLevel]
      ? roastGradients[bean.roastLevel]
      : roastGradients.medium
  const roastBadge =
    bean.roastLevel && roastBadgeStyles[bean.roastLevel]
      ? roastBadgeStyles[bean.roastLevel]
      : null
  const weightStats = computeWeightStats(bean)
  const roastDate = bean.roastDate
    ? new Date(bean.roastDate).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })
    : null

  return (
    <Link
      to="/beans/$beanId"
      params={{ beanId: String(bean.id) }}
      className="group block overflow-hidden rounded-3xl bg-card shadow-[0_8px_24px_-18px_rgba(60,42,30,0.45)] transition-transform hover:-translate-y-0.5"
    >
      <div
        className="relative h-36 overflow-hidden"
        style={{
          background: thumbnail
            ? undefined
            : `radial-gradient(circle at 38% 32%, ${gradient[0]}, ${gradient[1]})`,
        }}
      >
        {thumbnail && (
          <img
            src={thumbnailUrl(baseUrl, thumbnail.storagePath)}
            alt=""
            loading="lazy"
            decoding="async"
            width={640}
            height={400}
            className="h-full w-full object-cover"
          />
        )}
        {roastBadge && (
          <span
            className="absolute left-3 top-3 rounded-xl px-2.5 py-1 text-xs font-bold"
            style={{ background: roastBadge.bg, color: roastBadge.fg }}
          >
            {roastBadge.label}
          </span>
        )}
      </div>
      <div className="space-y-3 px-5 py-4">
        <div>
          <p className="font-display text-lg font-bold text-foreground">{bean.name}</p>
          {bean.roaster && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {bean.roaster}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {bean.region && bean.origin ? (
            <Pill>{bean.region}, {bean.origin}</Pill>
          ) : bean.origin ? (
            <Pill>{bean.origin}</Pill>
          ) : null}
          {bean.process && <Pill className="capitalize">{bean.process}</Pill>}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className="text-muted-foreground">
            {roastDate ? `Roasted ${roastDate}` : "No roast date"}
          </span>
          {weightStats && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full"
                  style={{
                    width: `${weightStats.percent}%`,
                    background:
                      weightStats.percent < 30 ? "var(--destructive)" : "var(--primary)",
                  }}
                />
              </div>
              <span className="font-bold text-foreground">
                {Math.round(weightStats.remaining)}g
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function Pill({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={`rounded-xl border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground ${className}`}
    >
      {children}
    </span>
  )
}

function computeWeightStats(bean: Bean) {
  if (!bean.weight) return null
  const initial = parseFloat(bean.weight)
  if (Number.isNaN(initial) || initial <= 0) return null
  // Without joined shots data we can only show the initial bag weight as
  // remaining; the detail page handles the precise computation.
  return {
    remaining: initial,
    percent: 100,
  }
}
