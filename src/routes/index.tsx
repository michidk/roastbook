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
import { useTasteProfile } from '@/hooks/use-taste-profile'
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
  const showRating = useTasteProfile().overallRating
  const now = new Date()
  const headline = getDailyHeadline(now)

  return (
    <Page>
      <PageHeader title={headline} />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard
          value={formatNumber(stats.totalShots)}
          label="brews logged"
          href="/brews"
          variant="hero"
        />
        <MetricCard
          value={formatNumber(stats.activeBeans)}
          label="bags in rotation"
          href="/beans"
        />
        <MetricCard
          value={formatNumber(stats.shotsThisMonth)}
          label="brews this month"
          href="/brews"
        />
        <MetricCard
          value={formatNumber(stats.cafeVisits)}
          label="coffees out"
          href="/visits"
        />
      </section>

      <section className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_340px] lg:gap-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent brews</CardTitle>
            <Link
              to="/brews"
              className="-mx-2 inline-flex min-h-11 items-center rounded-md px-2 font-display text-sm font-bold text-link hover:underline [@media(hover:hover)_and_(pointer:fine)]:min-h-0"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentShots.length === 0 ? (
              <div className="rounded-2xl bg-secondary px-4 py-6 text-center sm:px-5 sm:py-8">
                <p className="text-sm text-muted-foreground">
                  No brews logged yet. Start by recording your first coffee.
                </p>
                <Button className="mt-4" asChild>
                  <Link to="/brews/new">Log your first brew</Link>
                </Button>
              </div>
            ) : (
              recentShots.map((shot) => {
                const beanImage = shot.bean?.images?.[0]
                const brewedToday = isSameDay(new Date(shot.brewedAt), now)
                return (
                  <Link
                    key={shot.id}
                    to="/brews/$shotId"
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
                        {shot.brewingMethod.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 self-stretch flex-col items-end justify-center gap-1">
                      {brewedToday ? null : (
                        <time
                          dateTime={new Date(shot.brewedAt).toISOString()}
                          className="text-xs font-semibold text-muted-foreground"
                        >
                          {formatDate(shot.brewedAt)}
                        </time>
                      )}
                      {showRating && shot.rating ? (
                        <StarRating
                          value={shot.rating}
                          variant="compact"
                          sizeClassName="size-4"
                          className="text-sm"
                          ariaLabel="Brew rating"
                        />
                      ) : null}
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
          <CardContent className="space-y-2">
            <QuickAddRow icon={Coffee} label="Log a brew" href="/brews/new" />
            <QuickAddRow
              icon={UtensilsCrossed}
              label="Log a visit"
              href="/visits/new"
            />
            <QuickAddRow icon={Bean} label="Add beans" href="/beans/new" />
            <QuickAddRow icon={Cog} label="Add gear" href="/gear/new" />
            <QuickAddRow icon={MapPin} label="Add café" href="/places/new" />
          </CardContent>
        </Card>
      </section>
    </Page>
  )
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
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
      className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-secondary px-3.5 py-2 transition-colors hover:bg-accent/70 sm:px-4 sm:py-3"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground sm:size-9">
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
  const palette = palettes[seed % palettes.length]
  if (!palette) return null
  const [light, dark] = palette
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
