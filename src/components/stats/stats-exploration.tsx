import { Link } from '@tanstack/react-router'
import { BookOpen, CircleDollarSign, Compass, Wrench } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Progress } from '@/components/ui/progress'
import { StarRating } from '@/components/ui/star-rating'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { gearChartConfig } from './stats-chart-config'
import type { DetailedStats } from './stats-types'

type UsageItem = {
  readonly name: string | null
  readonly count: number
  readonly avgRating: number | null
}

function UsageList({
  title,
  items,
}: {
  readonly title: string
  readonly items: readonly UsageItem[]
}) {
  const formatNumber = useNumberFormatter()
  const max = Math.max(1, ...items.map((item) => item.count))
  return (
    <section aria-label={title}>
      <h3 className="font-display text-base font-bold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Not enough metadata yet.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.slice(0, 5).map((item) => (
            <div key={item.name}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium">{item.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                  {item.avgRating !== null ? (
                    <StarRating value={item.avgRating} variant="compact" />
                  ) : null}
                  {formatNumber(item.count)}
                </span>
              </div>
              <Progress
                value={(item.count / max) * 100}
                className="mt-1 h-1.5"
                aria-label={`${item.name}: ${formatNumber(item.count)} brews`}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function MethodMixCard({
  methods,
}: {
  readonly methods: DetailedStats['methods']
}) {
  const formatNumber = useNumberFormatter()
  const max = Math.max(1, ...methods.map((method) => method.shotCount))
  if (methods.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Brewing method mix</CardTitle>
        <p className="text-sm text-muted-foreground">
          A text summary accompanies the usage bars and average ratings.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {methods.map((method) => (
          <div key={method.methodId}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">{method.methodName}</span>
              <span className="flex items-center gap-3 text-muted-foreground">
                {method.avgRating !== null ? (
                  <StarRating value={method.avgRating} variant="compact" />
                ) : null}
                {formatNumber(method.shotCount)} brews
              </span>
            </div>
            <Progress
              value={(method.shotCount / max) * 100}
              className="mt-1.5 h-2"
              aria-label={`${method.methodName}: ${formatNumber(method.shotCount)} brews`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function ExplorationCard({
  exploration,
}: {
  readonly exploration: DetailedStats['exploration']
}) {
  const hasAny =
    exploration.roasters.length > 0 ||
    exploration.origins.length > 0 ||
    exploration.processes.length > 0 ||
    exploration.roastLevels.length > 0 ||
    exploration.roastAge.length > 0
  if (!hasAny) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="h-5 w-5" />
          Coffee exploration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Usage and average rating across the bean metadata already in your
          journal.
        </p>
      </CardHeader>
      <CardContent className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        <UsageList title="Roasters" items={exploration.roasters} />
        <UsageList title="Origins" items={exploration.origins} />
        <UsageList title="Processes" items={exploration.processes} />
        <UsageList title="Roast levels" items={exploration.roastLevels} />
        <UsageList title="Days after roast" items={exploration.roastAge} />
      </CardContent>
    </Card>
  )
}

export function RecipePerformanceCard({
  recipes,
}: {
  readonly recipes: DetailedStats['exploration']['recipes']
}) {
  const formatNumber = useNumberFormatter()
  if (recipes.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Recipe performance
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Recipes appear after at least three attributed brews.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {recipes.map((recipe, index) => (
          <div key={recipe.recipeId} className="flex items-center gap-3">
            <span className="w-6 text-sm font-medium text-muted-foreground">
              #{index + 1}
            </span>
            <Link
              to="/recipes/$recipeId"
              params={{ recipeId: String(recipe.recipeId) }}
              className="inline-flex min-h-11 min-w-0 flex-1 items-center truncate rounded-md font-medium hover:underline [@media(hover:hover)_and_(pointer:fine)]:min-h-0"
            >
              {recipe.recipeName}
            </Link>
            {recipe.avgRating !== null ? (
              <StarRating value={recipe.avgRating} variant="compact" />
            ) : null}
            <span className="text-sm text-muted-foreground">
              {formatNumber(recipe.count)} brews
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

type GearItem = DetailedStats['gear']['brewers'][number]

export function GearUsageCard({
  title,
  items,
}: {
  readonly title: string
  readonly items: readonly GearItem[]
}) {
  const formatNumber = useNumberFormatter()
  if (items.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {items
            .slice(0, 3)
            .map((item) => `${item.gearName}: ${formatNumber(item.shotCount)}`)
            .join(' · ')}
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={gearChartConfig} className="h-[220px] w-full">
          <BarChart data={items} layout="vertical" accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="gearName"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={110}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="shotCount"
              fill="var(--color-shotCount)"
              radius={4}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function CostCard({ stats }: { readonly stats: DetailedStats }) {
  const formatNumber = useNumberFormatter()
  const home = stats.cost.home
  const cafe = stats.visits.spend
  if (home.length === 0 && cafe.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5" />
          Coffee cost
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Currencies remain separate. Home cost is estimated from bag price, bag
          weight, and recorded dose.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <section>
          <h3 className="font-display font-bold">Home brewing</h3>
          <div className="mt-3 space-y-3">
            {home.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add bean price and weight to estimate home cost.
              </p>
            ) : (
              home.map((item) => (
                <div
                  key={item.currency}
                  className="rounded-2xl bg-secondary/70 p-4"
                >
                  <p className="text-2xl font-bold tabular-nums">
                    {item.currency} {formatNumber(item.total.toFixed(2))}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.currency} {formatNumber(item.average.toFixed(2))} per
                    covered brew · {formatNumber(item.count)} brews
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
        <section>
          <h3 className="font-display font-bold">Café visits</h3>
          <div className="mt-3 space-y-3">
            {cafe.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Record visit prices to see café spending.
              </p>
            ) : (
              cafe.map((item) => (
                <div
                  key={item.currency}
                  className="rounded-2xl bg-secondary/70 p-4"
                >
                  <p className="text-2xl font-bold tabular-nums">
                    {item.currency} {formatNumber(item.total.toFixed(2))}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.currency} {formatNumber(item.average.toFixed(2))} per
                    priced visit · {formatNumber(item.count)} visits
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  )
}
