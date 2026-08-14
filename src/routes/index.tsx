import { createFileRoute, Link } from '@tanstack/react-router'
import { Bean, Coffee, Cog, MapPin, UtensilsCrossed } from 'lucide-react'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { MetricCard } from '@/components/metric-card'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { RoutePending } from '@/components/route-pending'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StarRating } from '@/components/ui/star-rating'
import { useDateFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { getDailyHeadline } from '@/lib/daily-headline'
import { thumbnailUrl } from '@/lib/image-url'
import { getDashboardStats, getRecentShots } from '@/lib/server/stats'

export const Route = createFileRoute('/')({
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

function Dashboard() {
  const { stats, recentShots } = Route.useLoaderData()
  const formatDate = useDateFormatter()
  const formatNumber = useNumberFormatter()
  const now = new Date()
  const today = formatDate(now)
  const headline = getDailyHeadline(now)

  return (
    <Page>
      <PageHeader title={headline} eyebrow={today} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          value={formatNumber(stats.totalShots)}
          label="espresso shots logged"
          href="/shots"
          variant="hero"
        />
        <MetricCard
          value={formatNumber(stats.activeBeans)}
          label="bags in rotation"
          href="/beans"
        />
        <MetricCard
          value={formatNumber(stats.shotsThisMonth)}
          label="shots this month"
          href="/shots"
        />
        <MetricCard
          value={formatNumber(stats.cafeVisits)}
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
              className="font-display text-sm font-bold text-link hover:underline"
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
                        {shot.bean?.name ?? 'Unknown beans'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {shot.doseGrams && shot.yieldGrams
                          ? `${formatNumber(shot.doseGrams)} g → ${formatNumber(shot.yieldGrams)} g`
                          : 'No dose or yield recorded'}
                        {shot.shotTimeSeconds
                          ? ` · ${formatNumber(shot.shotTimeSeconds)} s`
                          : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 self-stretch flex-col items-end justify-between">
                      <time
                        dateTime={new Date(shot.createdAt).toISOString()}
                        className="text-xs font-semibold text-muted-foreground"
                      >
                        {formatDate(shot.createdAt)}
                      </time>
                      {shot.rating && (
                        <StarRating
                          value={shot.rating}
                          variant="compact"
                          sizeClassName="size-4"
                          className="text-sm"
                          ariaLabel="Shot rating"
                        />
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
            <QuickAddRow icon={MapPin} label="Add café" href="/shops/new" />
          </CardContent>
        </Card>
      </section>
    </Page>
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
    ['var(--chart-4)', 'var(--coffee)'],
    ['var(--coffee)', 'var(--foreground)'],
    ['var(--chart-1)', 'var(--coffee)'],
    ['var(--chart-3)', 'var(--coffee)'],
    ['var(--accent-foreground)', 'var(--foreground)'],
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
