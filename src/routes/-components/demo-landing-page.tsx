import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Bean,
  BookOpen,
  Camera,
  Coffee,
  Github,
  LockKeyhole,
  MapPin,
  Plus,
  Search,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LandingProductShowcases } from '@/routes/-components/landing-product-showcases'

const aiFeatures = [
  {
    icon: Camera,
    title: 'Scan the bag, skip the typing',
    description:
      'Photograph a coffee bag and turn its label into structured bean details, ready to review and save.',
  },
  {
    icon: Search,
    title: 'Research the missing context',
    description:
      'Fill in beans, roasters, and machine settings from relevant sources instead of hunting them down yourself.',
  },
  {
    icon: WandSparkles,
    title: 'Dial in the next brew',
    description:
      'Compare a brew with your matching history and get one evidence-grounded adjustment to try next.',
  },
] as const

const previewBeans = [
  {
    name: 'Moonrise Lot 17',
    roaster: 'Ember Atlas',
    detail: 'Luma Highlands · Washed',
    image: '/media/demo/kraft-orange.thumb.webp',
  },
  {
    name: 'Coral Ridge Honey',
    roaster: 'Quiet Current',
    detail: 'San Aurelio · Natural',
    image: '/media/demo/forest-botanical.thumb.webp',
  },
  {
    name: 'Glasshouse Bloom',
    roaster: 'Juniper & Coil',
    detail: 'Verdant Reach · Washed',
    image: '/media/demo/cobalt-sunburst.thumb.webp',
  },
] as const

const previewBrews = [
  { name: 'Worka Sakaro', method: 'V60', rating: '4.7' },
  { name: 'La Muralla', method: 'Espresso', rating: '4.5' },
  { name: 'Finca El Paraíso', method: 'AeroPress', rating: '4.3' },
] as const

export function DemoLandingPage() {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:border focus:bg-background focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <LandingHeader />

      <main id="main-content" className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingBeanShowcase />
        <LandingProductShowcases />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  )
}

function LandingHeader() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-border/70">
      <Link
        to="/"
        aria-label="Roastbook home"
        className="flex min-h-11 items-center gap-2.5"
      >
        <span className="flex size-10 overflow-hidden rounded-xl">
          <img
            src="/navbar-logo.png"
            alt=""
            width={40}
            height={40}
            className="size-full object-cover"
          />
        </span>
        <span className="font-display text-xl font-extrabold tracking-tight">
          Roastbook
        </span>
      </Link>
      <div className="flex items-center gap-1 sm:gap-2">
        <a
          href="https://github.com/michidk/roastbook"
          target="_blank"
          rel="noreferrer"
          className="hidden min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground sm:flex"
        >
          <Github className="size-4" aria-hidden="true" />
          GitHub
        </a>
        <ThemeToggle />
        <Button asChild size="sm">
          <Link to="/overview">
            Explore demo
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </header>
  )
}

function LandingHero() {
  return (
    <section className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,0.88fr)_minmax(520px,1.12fr)] lg:gap-16 lg:py-24">
      <div className="max-w-2xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-sm font-semibold text-muted-foreground shadow-coffee">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          AI-native. Self-hosted. Entirely yours.
        </div>
        <h1 className="font-display text-5xl leading-[0.98] font-extrabold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
          Scan the bag. Dial in the brew.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Roastbook turns a label photo into structured coffee details, then
          uses your own brew history to suggest what to change next.
        </p>
        <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
          <Button asChild size="lg">
            <Link to="/overview">
              Explore the live demo
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a
              href="https://github.com/michidk/roastbook#quick-start-with-docker-compose"
              target="_blank"
              rel="noreferrer"
            >
              Self-host Roastbook
            </a>
          </Button>
        </div>
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          The demo uses fictional sample data and is read-only. No account
          needed.
        </p>
      </div>
      <ProductPreview />
    </section>
  )
}

function LandingFeatures() {
  return (
    <section
      aria-labelledby="why-roastbook"
      className="border-t border-border/70 py-14 sm:py-20"
    >
      <div className="max-w-2xl">
        <p className="font-display text-sm font-bold tracking-[0.16em] text-primary uppercase">
          AI that earns its place
        </p>
        <h2
          id="why-roastbook"
          className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
        >
          Less data entry. More useful context.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Use AI where it saves time or helps you make a decision. Every core
          journal feature keeps working when AI is turned off.
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {aiFeatures.map((feature) => (
          <Card key={feature.title} className="h-full">
            <CardContent>
              <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <feature.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="font-display text-xl font-bold tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

function LandingBeanShowcase() {
  return (
    <section className="grid items-center gap-10 border-t border-border/70 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:gap-16">
      <BeanCollectionPreview />
      <div className="max-w-xl">
        <p className="font-display text-sm font-bold tracking-[0.16em] text-primary uppercase">
          From photo to coffee record
        </p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Start with a bag, not an empty form.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Scan the label, review the extracted origin, process, roast, and
          tasting notes, then keep everything linked to every brew you make.
        </p>
        <div className="mt-6 flex gap-3 rounded-2xl border border-border bg-card/80 p-4 shadow-coffee">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="font-bold text-foreground">
              Optional and server-side.
            </strong>{' '}
            Self-host your journal, choose an OpenAI-compatible endpoint, and
            inspect the raw inputs and responses behind every request.
          </p>
        </div>
      </div>
    </section>
  )
}

function BeanCollectionPreview() {
  return (
    <div aria-hidden="true" className="relative min-w-0">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(circle,var(--accent)_0%,transparent_68%)] opacity-75" />
      <div className="overflow-hidden rounded-3xl border border-border bg-background/85 shadow-coffee-strong backdrop-blur-sm">
        <BeanPreviewHeader />
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {previewBeans.map((bean, index) => (
              <BeanPreviewCard key={bean.name} bean={bean} scanned={!index} />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-accent/75 p-3 sm:p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold">Label scanned</p>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                12 bean details extracted and ready to review
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BeanPreviewHeader() {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-card/85 px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-extrabold">Beans</p>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Keep track of the coffee beans you brew.
        </p>
      </div>
      <span className="hidden min-h-9 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs text-muted-foreground min-[480px]:flex">
        <Search className="size-3.5" />
        Search beans…
      </span>
      <span className="flex min-h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground">
        <Plus className="size-3.5" />
        <span className="hidden sm:inline">Add beans</span>
      </span>
    </div>
  )
}

function BeanPreviewCard({
  bean,
  scanned,
}: {
  readonly bean: (typeof previewBeans)[number]
  readonly scanned: boolean
}) {
  return (
    <div className="relative flex aspect-[0.72] min-w-0 flex-col overflow-hidden rounded-xl bg-coffee p-2.5 text-white shadow-sm sm:rounded-2xl sm:p-4">
      <img
        src={bean.image}
        alt=""
        width={1200}
        height={1200}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/90" />
      <span className="relative w-fit rounded-full border border-white/50 bg-black/40 px-2 py-1 text-[8px] font-bold tracking-wide uppercase backdrop-blur-sm sm:text-[10px]">
        {scanned ? 'AI scanned' : 'Active'}
      </span>
      <div className="relative mt-auto min-w-0">
        <p className="truncate text-[8px] font-bold tracking-wider text-white/80 uppercase sm:text-xs">
          {bean.roaster}
        </p>
        <p className="mt-0.5 line-clamp-2 font-display text-xs leading-tight font-extrabold sm:text-lg">
          {bean.name}
        </p>
        <p className="mt-2 flex min-w-0 items-center gap-1 text-[8px] text-white/80 sm:text-xs">
          <MapPin className="size-2.5 shrink-0 sm:size-3.5" />
          <span className="truncate">{bean.detail}</span>
        </p>
      </div>
    </div>
  )
}

function LandingCta() {
  return (
    <section className="mb-8 overflow-hidden rounded-3xl bg-ink px-6 py-10 text-ink-foreground sm:px-10 sm:py-12 lg:flex lg:items-center lg:justify-between lg:gap-8">
      <div>
        <p className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          See what your coffee has been trying to tell you.
        </p>
        <p className="mt-3 max-w-2xl text-base text-ink-foreground/75 sm:text-lg">
          Explore brews, beans, recipes, café visits, gear, and statistics in
          the complete read-only demo.
        </p>
      </div>
      <Button
        asChild
        size="lg"
        className="mt-7 border-card bg-card text-foreground hover:border-accent hover:bg-accent lg:mt-0"
      >
        <Link to="/overview">
          Open Roastbook
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  )
}

function LandingFooter() {
  return (
    <footer className="flex flex-col gap-3 border-t border-border/70 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>Roastbook is open-source software for people who care about coffee.</p>
      <a
        href="https://github.com/michidk/roastbook"
        target="_blank"
        rel="noreferrer"
        className="font-bold text-link hover:underline"
      >
        View the source on GitHub
      </a>
    </footer>
  )
}

function ProductPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-2xl lg:mx-0"
    >
      <div
        aria-hidden="true"
        className="absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(circle,var(--accent)_0%,transparent_68%)] opacity-80"
      />
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-coffee-strong">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="flex size-8 overflow-hidden rounded-lg">
              <img
                src="/navbar-logo.png"
                alt=""
                width={32}
                height={32}
                className="size-full object-cover"
              />
            </span>
            <span className="font-display font-extrabold">Roastbook</span>
          </div>
          <div className="hidden gap-4 text-xs font-bold text-muted-foreground sm:flex">
            <span className="text-primary">Brews</span>
            <span>Beans</span>
            <span>Café visits</span>
          </div>
        </div>

        <div className="bg-background/70 p-4 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-muted-foreground">
                SATURDAY, 29 AUGUST
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                Good morning. What are we brewing?
              </p>
            </div>
            <span className="hidden size-11 items-center justify-center rounded-full bg-primary text-primary-foreground sm:flex">
              <Coffee className="size-5" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {[
              ['186', 'brews logged'],
              ['8', 'bags in rotation'],
              ['24', 'this month'],
            ].map(([value, label], index) => (
              <div
                key={label}
                className={
                  index === 0
                    ? 'rounded-2xl bg-coffee p-3 text-coffee-foreground sm:p-4'
                    : 'rounded-2xl border border-border bg-card p-3 sm:p-4'
                }
              >
                <p className="font-display text-2xl font-extrabold tabular-nums sm:text-3xl">
                  {value}
                </p>
                <p
                  className={
                    index === 0
                      ? 'mt-1 text-xs font-semibold text-coffee-foreground/75'
                      : 'mt-1 text-xs font-semibold text-muted-foreground'
                  }
                >
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-display font-bold">Recent brews</p>
              <BookOpen
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <div className="mt-3 space-y-2">
              {previewBrews.map((brew, index) => (
                <div
                  key={brew.name}
                  className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2.5"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-coffee-foreground"
                    style={{
                      background: `linear-gradient(145deg, var(--chart-${(index % 4) + 1}), var(--coffee))`,
                    }}
                  >
                    <Bean className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-bold">
                      {brew.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {brew.method}
                    </p>
                  </div>
                  <span className="font-display text-sm font-bold text-primary tabular-nums">
                    {brew.rating}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
