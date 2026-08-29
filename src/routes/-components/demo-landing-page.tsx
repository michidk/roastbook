import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Bean,
  BookOpen,
  Coffee,
  Github,
  LineChart,
  LockKeyhole,
  Sparkles,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    icon: Coffee,
    title: 'Log the details that matter',
    description:
      'Capture dose, yield, time, taste, recipes, and gear without turning every brew into homework.',
  },
  {
    icon: LineChart,
    title: 'Turn notes into answers',
    description:
      'See how grind, method, beans, and equipment shape the cups you want to make again.',
  },
  {
    icon: LockKeyhole,
    title: 'Keep your journal yours',
    description:
      'Self-host on your own infrastructure with no account, telemetry, subscription, or upsell.',
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
          The coffee journal you actually own.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Remember every great cup, understand what made it work, and let
          Roastbook handle the tedious details in between.
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
          Brew with context
        </p>
        <h2
          id="why-roastbook"
          className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
        >
          More useful than a notebook. More personal than a platform.
        </h2>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
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
