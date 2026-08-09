import { Link } from "@tanstack/react-router"
import { ArrowUpRight, Bean, CalendarDays, MapPin, Scale } from "lucide-react"
import { ResilientImage } from "@/components/resilient-image"
import { Card, CardContent } from "@/components/ui/card"
import { thumbnailUrl } from "@/lib/image-url"
import type { getBeans } from "@/lib/server/beans"

type BeanRecord = Awaited<ReturnType<typeof getBeans>>[number]

type BeanCardProps = {
  readonly bean: BeanRecord
}

const roastGradients: Record<string, readonly [string, string]> = {
  light: ["var(--chart-1)", "var(--accent-foreground)"],
  medium_light: ["var(--chart-4)", "var(--coffee)"],
  medium: ["var(--chart-4)", "var(--coffee)"],
  medium_dark: ["var(--chart-3)", "var(--coffee)"],
  dark: ["var(--coffee)", "var(--foreground)"],
}

const roastBadgeStyles: Record<
  string,
  { readonly className: string; readonly label: string }
> = {
  light: { className: "bg-secondary text-accent-foreground", label: "Light" },
  medium_light: { className: "bg-accent text-accent-foreground", label: "Medium-light" },
  medium: { className: "bg-accent text-coffee", label: "Medium" },
  medium_dark: { className: "bg-secondary text-coffee", label: "Medium-dark" },
  dark: { className: "bg-coffee text-coffee-foreground", label: "Dark" },
}

export function BeanCard({ bean }: BeanCardProps) {
  const thumbnail = bean.images.find((image) => image.isThumbnail) ?? bean.images[0]
  const gradient =
    bean.roastLevel && roastGradients[bean.roastLevel]
      ? roastGradients[bean.roastLevel]
      : roastGradients.medium
  const roastBadge =
    bean.roastLevel && roastBadgeStyles[bean.roastLevel]
      ? roastBadgeStyles[bean.roastLevel]
      : { className: "bg-card text-muted-foreground", label: "Roast not set" }
  const roasterName = bean.roasterRef?.name ?? bean.roaster
  const bagWeight = parseBagWeight(bean.weight)
  const roastDate = bean.roastDate
    ? new Date(bean.roastDate).toLocaleDateString("en", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })
    : null

  return (
    <Link
      to="/beans/$beanId"
      params={{ beanId: String(bean.id) }}
      aria-label={`View ${bean.name}`}
      className="group block h-full rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full gap-0 py-0 transition-transform duration-200 group-hover:-translate-y-1 motion-reduce:group-hover:translate-none">
        <div
          className="relative aspect-[16/9] overflow-hidden bg-secondary"
          style={{
            background: thumbnail
              ? undefined
              : `radial-gradient(circle at 38% 32%, ${gradient[0]}, ${gradient[1]})`,
          }}
        >
          {thumbnail && (
            <ResilientImage
              src={thumbnailUrl(thumbnail.storagePath)}
              alt=""
              loading="lazy"
              decoding="async"
              width={640}
              height={400}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:group-hover:scale-none"
              fallback={
                <div className="flex size-20 rotate-6 items-center justify-center rounded-[2rem] border-2 border-card/70 bg-coffee text-coffee-foreground shadow-coffee-strong ring-8 ring-card/15">
                  <Bean className="size-10 -rotate-6 drop-shadow-sm" strokeWidth={1.75} />
                </div>
              }
            />
          )}
          {!thumbnail && (
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <div className="flex size-20 rotate-6 items-center justify-center rounded-[2rem] border-2 border-card/70 bg-coffee text-coffee-foreground shadow-coffee-strong ring-8 ring-card/15">
                <Bean className="size-10 -rotate-6 drop-shadow-sm" strokeWidth={1.75} />
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/35 via-transparent to-card/10" />
          <span
            className={`absolute top-3 left-3 rounded-xl border border-card px-2.5 py-1 text-xs font-bold shadow-sm ${roastBadge.className}`}
          >
            {roastBadge.label}
          </span>
          <span className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-xl border border-card bg-card text-foreground shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-none">
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        </div>

        <CardContent className="flex min-h-40 flex-1 flex-col gap-4 bg-gradient-to-b from-card to-secondary/30 p-5">
        <div className="min-w-0">
          {roasterName && (
            <p className="mb-1 truncate text-xs font-bold tracking-[0.08em] text-coffee uppercase">
              {roasterName}
            </p>
          )}
          {!roasterName && (
            <p className="mb-1 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
              Roaster not added
            </p>
          )}
          <p className="text-balance font-display text-xl leading-tight font-extrabold tracking-tight text-foreground">
            {bean.name}
          </p>
        </div>

        {(bean.origin || bean.process) && (
          <div className="flex flex-wrap gap-2">
            {bean.region && bean.origin ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                <MapPin className="size-3.5 text-coffee" aria-hidden="true" />
                {bean.region}, {bean.origin}
              </span>
            ) : bean.origin ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                <MapPin className="size-3.5 text-coffee" aria-hidden="true" />
                {bean.origin}
              </span>
            ) : null}
            {bean.process && (
              <span className="inline-flex items-center rounded-xl border border-border bg-secondary/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground capitalize">
                {bean.process}
              </span>
            )}
          </div>
        )}
        {!bean.origin && !bean.process && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MapPin className="size-3.5 text-coffee" aria-hidden="true" />
            Origin and process not added
          </p>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-4 text-xs">
          <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
            <CalendarDays className="size-3.5 shrink-0 text-coffee" aria-hidden="true" />
            <span className="truncate">
              {roastDate ? `Roasted ${roastDate}` : "No roast date"}
            </span>
          </span>
          <span className="flex min-w-0 items-center justify-end gap-2 text-muted-foreground">
            <Scale className="size-3.5 shrink-0 text-coffee" aria-hidden="true" />
            <span className="truncate font-semibold tabular-nums">
              {bagWeight === null ? "Weight not added" : `${Math.round(bagWeight)}g bag`}
            </span>
          </span>
        </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function parseBagWeight(weight: string | null) {
  if (!weight) return null
  const parsedWeight = parseFloat(weight)
  return Number.isNaN(parsedWeight) || parsedWeight <= 0 ? null : parsedWeight
}
