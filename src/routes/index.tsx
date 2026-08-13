import { createFileRoute, Link } from "@tanstack/react-router"
import { Bean, Cog, Coffee, MapPin, UtensilsCrossed } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getDashboardStats, getRecentShots } from "@/lib/server/stats"
import { RouteError } from "@/components/route-error"
import { RoutePending } from "@/components/route-pending"
import { thumbnailUrl } from "@/lib/image-url"
import { ImageWithFallback } from "@/components/image-with-fallback"
import { getDailyHeadline } from "@/lib/daily-headline"

export const Route = createFileRoute("/")({
  loader: async () => {
    const [stats, recentShots] = await Promise.all([
      getDashboardStats(),
      getRecentShots({ data: 5 }),
    ])
    return { stats, recentShots }
  },
  component: Dashboard,
  pendingComponent: RoutePending,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
})

const recentShotDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
})

function Dashboard() {
  const { stats, recentShots } = Route.useLoaderData()
  const now = new Date()
  const today = dateFormatter.format(now)
  const headline = getDailyHeadline(now)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm font-semibold text-muted-foreground">{today}</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          {headline}
        </h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HeroStatCard
          value={stats.totalShots}
          label="espresso shots logged"
          href="/shots"
        />
        <StatCard
          value={stats.activeBeans}
          label="bags in rotation"
          href="/beans"
        />
        <StatCard
          value={stats.shotsThisMonth}
          label="shots this month"
          href="/shots"
        />
        <StatCard
          value={stats.cafeVisits}
          label="coffees out"
          href="/visits"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent shots</CardTitle>
            <Link
              to="/shots"
              className="font-display text-sm font-bold text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentShots.length === 0 ? (
              <div className="rounded-2xl bg-secondary px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No shots logged yet. Start by logging your first espresso.
                </p>
                <Button className="mt-4" asChild>
                  <Link to="/shots/new">Log your first shot</Link>
                </Button>
              </div>
            ) : (
              recentShots.map((shot) => {
                const beanImage = shot.bean?.images?.[0]
                return (
                  <Link
                    key={shot.id}
                    to="/shots/$shotId"
                    params={{ shotId: String(shot.id) }}
                    className="flex items-center gap-3.5 rounded-2xl bg-secondary px-4 py-3 transition-colors hover:bg-accent/70"
                  >
                    {beanImage ? (
                      <ImageWithFallback
                        src={thumbnailUrl(beanImage.storagePath)}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <BeanSwatch seed={shot.id} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-bold text-foreground">
                        {shot.bean?.name ?? "Unknown beans"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {shot.doseGrams && shot.yieldGrams
                          ? `${shot.doseGrams}g → ${shot.yieldGrams}g`
                          : "No dose or yield recorded"}
                        {shot.shotTimeSeconds
                          ? ` · ${shot.shotTimeSeconds}s`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 self-stretch flex-col items-end justify-between">
                      <time
                        dateTime={new Date(shot.createdAt).toISOString()}
                        className="text-xs font-semibold text-muted-foreground"
                      >
                        {recentShotDateFormatter.format(new Date(shot.createdAt))}
                      </time>
                      {shot.rating && (
                        <div className="rounded-xl bg-card px-3 py-1.5 font-display text-sm font-bold text-primary">
                          {shot.rating.toFixed(1)}★
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick add</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <QuickAddRow icon={Coffee} label="Log a shot" href="/shots/new" />
            <QuickAddRow
              icon={UtensilsCrossed}
              label="Log a visit"
              href="/visits/new"
            />
            <QuickAddRow icon={Bean} label="Add beans" href="/beans/new" />
            <QuickAddRow icon={Cog} label="Add gear" href="/gear/new" />
            <QuickAddRow icon={MapPin} label="Add a coffee shop" href="/shops/new" />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function HeroStatCard({
  value,
  label,
  href,
}: {
  value: number
  label: string
  href: string
}) {
  return (
    <Link to={href} className="block">
      <div className="rounded-3xl bg-coffee p-6 text-coffee-foreground shadow-coffee-strong transition-transform hover:-translate-y-0.5">
        <div className="font-display text-5xl font-extrabold leading-none">
          {value}
        </div>
        <div className="mt-2 text-sm font-semibold text-coffee-foreground/80">
          {label}
        </div>
      </div>
    </Link>
  )
}

function StatCard({
  value,
  label,
  href,
}: {
  value: number
  label: string
  href: string
}) {
  return (
    <Link to={href} className="block">
      <Card className="transition-transform hover:-translate-y-0.5">
        <CardContent>
          <div className="font-display text-5xl font-extrabold leading-none text-foreground">
            {value}
          </div>
          <div className="mt-2 text-sm font-semibold text-muted-foreground">
            {label}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function QuickAddRow({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
}) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 rounded-2xl border border-border bg-secondary px-4 py-3 transition-colors hover:bg-accent/70"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="font-display text-base font-bold text-foreground">
        {label}
      </span>
    </Link>
  )
}

function BeanSwatch({ seed }: { seed: number }) {
  const palettes = [
    ["var(--chart-4)", "var(--coffee)"],
    ["var(--coffee)", "var(--foreground)"],
    ["var(--chart-1)", "var(--coffee)"],
    ["var(--chart-3)", "var(--coffee)"],
    ["var(--accent-foreground)", "var(--foreground)"],
  ] as const
  const [light, dark] = palettes[seed % palettes.length]
  return (
    <div
      aria-hidden
      className="h-11 w-11 shrink-0 rounded-xl"
      style={{
        background: `radial-gradient(circle at 35% 30%, ${light}, ${dark})`,
      }}
    />
  )
}
