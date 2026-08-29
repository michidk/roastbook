import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Check,
  CircleGauge,
  Cog,
  History,
  Layers3,
  MapPin,
  Scale,
  SlidersHorizontal,
  Sparkles,
  Star,
  UtensilsCrossed,
} from 'lucide-react'
import type { ReactNode } from 'react'

const statsMetrics = [
  ['33', 'brews logged'],
  ['4.1', 'average rating'],
  ['7 days', 'longest streak'],
] as const

const visitPreviews = [
  {
    drink: 'Flat White',
    place: 'Lantern Room',
    date: '29 Aug',
    type: 'Milk',
    rating: 5,
  },
  {
    drink: 'Filter',
    place: 'Moss & Metric',
    date: '23 Aug',
    type: 'Filter',
    rating: 4,
  },
] as const

const gearPreviews = [
  {
    icon: CircleGauge,
    name: 'Aurora One',
    brand: 'Arc & Ember',
    type: 'Espresso machine',
  },
  {
    icon: Cog,
    name: 'Orbit Mill',
    brand: 'Quiet Mechanics',
    type: 'Grinder',
  },
  {
    icon: Scale,
    name: 'Mica Scale',
    brand: 'Northline Instruments',
    type: 'Scale',
  },
] as const

export function LandingProductShowcases() {
  return (
    <div className="divide-y divide-border/70 border-t border-border/70">
      <RecommendationSpotlight />
      <StatisticsSpotlight />
      <CafeVisitsSpotlight />
      <GearSpotlight />
    </div>
  )
}

function RecommendationSpotlight() {
  return (
    <section
      aria-labelledby="recommendations-heading"
      className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)] lg:gap-16"
    >
      <SpotlightCopy
        id="recommendations-heading"
        eyebrow="AI recommendations"
        title="Make the next brew a controlled experiment."
        description="Ask for an opinion on a draft or a logged brew. Roastbook compares the same bean, method, and exact gear setup to find a useful next move."
        points={[
          'Get a clear diagnosis grounded in up to 50 matching brews.',
          'Change one small thing while keeping the rest of the recipe constant.',
        ]}
      />
      <AiRecommendationMock />
    </section>
  )
}

function StatisticsSpotlight() {
  return (
    <section
      aria-labelledby="statistics-heading"
      className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:gap-16"
    >
      <StatisticsMock />
      <SpotlightCopy
        id="statistics-heading"
        eyebrow="Statistics"
        title="Turn a year of brewing into answers."
        description="See quality, consistency, taste, rhythm, recipe performance, gear usage, and costs—not just a count of cups."
        points={[
          'Filter trends by date, bean, method, recipe, rating, or gear.',
          'See how changes to grind, dose, pressure, and time affected the cup.',
        ]}
      />
    </section>
  )
}

function CafeVisitsSpotlight() {
  return (
    <section
      aria-labelledby="cafe-visits-heading"
      className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)] lg:gap-16"
    >
      <SpotlightCopy
        id="cafe-visits-heading"
        eyebrow="Café visits"
        title="Remember the cafés worth returning to."
        description="Keep your coffee life away from home in the same journal: what you ordered, where you went, what it cost, and how it tasted."
        points={[
          'Link drinks to saved cafés and beans, with ratings and tasting notes.',
          'Map visited places, favorites, and the cafés still on your list.',
        ]}
      />
      <CafeVisitsMock />
    </section>
  )
}

function GearSpotlight() {
  return (
    <section
      aria-labelledby="gear-heading"
      className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:gap-16"
    >
      <GearMock />
      <SpotlightCopy
        id="gear-heading"
        eyebrow="Gear management"
        title="Save your setup once. Reuse it everywhere."
        description="Catalog brewers, machines, grinders, baskets, scales, and accessories, then connect the exact setup to every brew."
        points={[
          'Group equipment into gear sets that fill a new brew in one tap.',
          'Keep documented machine settings and brew history with the gear itself.',
        ]}
      />
    </section>
  )
}

function SpotlightCopy({
  id,
  eyebrow,
  title,
  description,
  points,
}: {
  readonly id: string
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly points: readonly string[]
}) {
  return (
    <div className="max-w-xl">
      <p className="font-display text-sm font-bold tracking-[0.16em] text-primary uppercase">
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
      >
        {title}
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        {description}
      </p>
      <ul className="mt-6 space-y-3">
        {points.map((point) => (
          <li key={point} className="flex gap-3 text-sm leading-relaxed">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Check className="size-3.5" aria-hidden="true" />
            </span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MockFrame({
  icon: Icon,
  title,
  action,
  children,
}: {
  readonly icon: LucideIcon
  readonly title: string
  readonly action: string
  readonly children: ReactNode
}) {
  return (
    <div aria-hidden="true" className="relative min-w-0">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(circle,var(--accent)_0%,transparent_68%)] opacity-70" />
      <div className="overflow-hidden rounded-3xl border border-border bg-background/85 shadow-coffee-strong backdrop-blur-sm">
        <div className="flex items-center gap-3 border-b border-border bg-card/85 px-4 py-3 sm:px-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="size-4.5" />
          </span>
          <p className="min-w-0 flex-1 font-display font-extrabold">{title}</p>
          <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            {action}
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

function AiRecommendationMock() {
  return (
    <MockFrame
      icon={Sparkles}
      title="AI opinion on this brew"
      action="High confidence"
    >
      <div className="space-y-4 p-4 sm:p-6">
        <div>
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
            Under-extracted · strong
          </span>
          <h3 className="mt-3 font-display text-xl font-extrabold sm:text-2xl">
            Nudge the grind finer and keep everything else steady.
          </h3>
        </div>
        <div className="rounded-2xl border border-border bg-muted/35 p-4">
          <p className="flex items-center gap-2 font-bold">
            <History className="size-4 text-primary" />
            How this brew compares
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Similar brews ran longer and rated higher without changing dose or
            temperature.
          </p>
        </div>
        <RecommendationChange />
        <p className="text-xs text-muted-foreground">
          Based on 8 matching brews · Moonrise Lot 17 · Pour over · exact gear
          match
        </p>
      </div>
    </MockFrame>
  )
}

function RecommendationChange() {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <SlidersHorizontal className="size-4 text-primary" />
        Change for the next brew
      </p>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="rounded-md bg-muted px-2.5 py-1.5">Grind 22</span>
        <span className="text-muted-foreground">→</span>
        <span className="rounded-md bg-primary/15 px-2.5 py-1.5 font-bold">
          Grind 20
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        A small change to increase contact time without moving another variable.
      </p>
    </div>
  )
}

function StatisticsMock() {
  return (
    <MockFrame icon={BarChart3} title="Statistics" action="Last 30 days">
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {statsMetrics.map(([value, label], index) => (
            <div
              key={label}
              className={
                index === 0
                  ? 'rounded-2xl bg-coffee p-3 text-coffee-foreground sm:p-4'
                  : 'rounded-2xl border border-border bg-card p-3 sm:p-4'
              }
            >
              <p className="font-display text-xl font-extrabold tabular-nums sm:text-2xl">
                {value}
              </p>
              <p className="mt-1 truncate text-[10px] font-semibold opacity-75 sm:text-xs">
                {label}
              </p>
            </div>
          ))}
        </div>
        <BrewQualityChart />
      </div>
    </MockFrame>
  )
}

function BrewQualityChart() {
  return (
    <div className="mt-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display font-bold">Brew quality</p>
          <p className="text-xs text-muted-foreground">
            Average rating by week
          </p>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold text-positive-text">
          <BarChart3 className="size-3.5" /> +8%
        </span>
      </div>
      <svg viewBox="0 0 520 150" className="mt-4 h-32 w-full" role="img">
        <title>Rising brew quality over six weeks</title>
        {[30, 75, 120].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="520"
            y2={y}
            stroke="var(--border)"
            strokeWidth="1"
          />
        ))}
        <path
          d="M 4 112 C 55 108, 62 82, 108 88 S 170 105, 215 72 S 278 78, 325 54 S 390 68, 430 38 S 482 47, 516 20"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

function CafeVisitsMock() {
  return (
    <MockFrame icon={UtensilsCrossed} title="Café visits" action="12 visits">
      <div className="grid gap-3 p-4 sm:grid-cols-[0.9fr_1.1fr] sm:p-6">
        <CafeMapMock />
        <div className="space-y-3">
          {visitPreviews.map((visit) => (
            <VisitPreview key={`${visit.place}-${visit.date}`} visit={visit} />
          ))}
        </div>
      </div>
    </MockFrame>
  )
}

function CafeMapMock() {
  return (
    <div className="relative min-h-48 overflow-hidden rounded-2xl border border-border bg-secondary sm:min-h-0">
      <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(35deg,transparent_46%,var(--border)_47%,var(--border)_49%,transparent_50%),linear-gradient(145deg,transparent_40%,var(--border)_41%,var(--border)_43%,transparent_44%)] [background-size:90px_80px]" />
      {[
        ['23%', '28%'],
        ['68%', '22%'],
        ['48%', '62%'],
        ['76%', '74%'],
      ].map(([left, top], index) => (
        <span
          key={`${left}-${top}`}
          className={
            index === 0
              ? 'absolute flex size-8 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-md'
              : 'absolute size-3 rounded-full border-2 border-background bg-coffee shadow-sm'
          }
          style={{ left, top }}
        >
          {index === 0 ? <MapPin className="size-3.5" /> : null}
        </span>
      ))}
      <span className="absolute bottom-3 left-3 rounded-full border border-border bg-card/90 px-2.5 py-1 text-[10px] font-bold shadow-sm">
        Paris · 4 saved cafés
      </span>
    </div>
  )
}

function VisitPreview({
  visit,
}: {
  readonly visit: (typeof visitPreviews)[number]
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-bold">{visit.drink}</p>
          <p className="truncate text-xs text-muted-foreground">
            {visit.place} · {visit.date}
          </p>
        </div>
        <span className="rounded-lg bg-coffee px-2 py-1 text-[10px] font-bold text-coffee-foreground">
          {visit.type}
        </span>
      </div>
      <div className="mt-3 flex gap-0.5 text-primary">
        {[1, 2, 3, 4, 5].map((rating) => (
          <Star
            key={rating}
            className="size-3.5"
            fill={rating <= visit.rating ? 'currentColor' : 'none'}
          />
        ))}
      </div>
    </div>
  )
}

function GearMock() {
  return (
    <MockFrame icon={Cog} title="Gear" action="8 items">
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {gearPreviews.map((item) => (
            <GearPreview key={item.name} item={item} />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-primary/30 bg-accent/75 p-3 sm:p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Layers3 className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-bold">Morning espresso</p>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              Aurora One · Orbit Mill · Mica Scale · High Flow 18g
            </p>
          </div>
        </div>
      </div>
    </MockFrame>
  )
}

function GearPreview({
  item,
}: {
  readonly item: (typeof gearPreviews)[number]
}) {
  const Icon = item.icon
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-3 sm:p-4">
      <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary sm:size-11">
        <Icon className="size-4.5 sm:size-5" />
      </span>
      <p className="mt-5 truncate font-display text-xs font-bold sm:text-base">
        {item.name}
      </p>
      <p className="mt-0.5 truncate text-[9px] text-muted-foreground sm:text-xs">
        {item.brand}
      </p>
      <p className="mt-3 truncate border-t border-border pt-3 text-[9px] font-bold text-primary sm:text-xs">
        {item.type}
      </p>
    </div>
  )
}
