import { createFileRoute, Link } from "@tanstack/react-router"
import { Bean, Cog, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getDashboardStats, getRecentShots } from "@/lib/server/stats"
import { RouteError } from "@/components/route-error"
import { RoutePending } from "@/components/route-pending"
import { thumbnailUrl } from "@/lib/image-url"

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

function Dashboard() {
  const { stats, recentShots } = Route.useLoaderData()
  const today = dateFormatter.format(new Date())

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm font-semibold text-muted-foreground">{today}</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          Let's brew something good
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
          value={stats.gearCount}
          label="pieces of equipment"
          href="/gear"
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
                      <img
                        src={thumbnailUrl("/uploads", beanImage.storagePath)}
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
                          : "No recipe recorded"}
                        {shot.brewTimeSeconds
                          ? ` · ${shot.brewTimeSeconds}s`
                          : ""}
                      </p>
                    </div>
                    {shot.rating && (
                      <div className="shrink-0 rounded-xl bg-card px-3 py-1.5 font-display text-sm font-bold text-primary">
                        {shot.rating.toFixed(1)}★
                      </div>
                    )}
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
            <QuickAddRow icon={Bean} label="Add beans" href="/beans/new" />
            <QuickAddRow icon={Cog} label="Add gear" href="/gear/new" />
            <QuickAddRow icon={MapPin} label="Add a café" href="/places/new" />
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
      <div className="rounded-3xl bg-coffee p-6 text-coffee-foreground shadow-[0_10px_30px_-18px_rgba(60,42,30,0.55)] transition-transform hover:-translate-y-0.5">
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
    ["#b07a45", "#6f4e37"],
    ["#7a4e2e", "#3f2614"],
    ["#a06a3e", "#523019"],
    ["#9a6a3e", "#5c3a22"],
    ["#8a5a30", "#452916"],
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
