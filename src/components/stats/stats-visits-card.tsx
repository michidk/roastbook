import { Link } from "@tanstack/react-router"
import { CalendarDays, Heart, MapPin, Star } from "lucide-react"
import type { ComponentType } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { getDetailedStats } from "@/lib/server/stats"

type DetailedStats = Awaited<ReturnType<typeof getDetailedStats>>

type StatsVisitsCardProps = {
  readonly visits: DetailedStats["visits"]
  readonly places: DetailedStats["places"]
}

const RANKING_EMPTY_MESSAGES = {
  "no-visits": "Log a visit to start seeing your most visited cafés here.",
  "unlinked-visits": "Link visits to a saved coffee shop to see your most visited places here.",
} as const

function getPlacesRankingState(
  totalVisits: number,
  rankedPlaces: number,
): "ranked" | keyof typeof RANKING_EMPTY_MESSAGES {
  if (rankedPlaces > 0) return "ranked"
  return totalVisits === 0 ? "no-visits" : "unlinked-visits"
}

export function StatsVisitsCard({ visits, places }: StatsVisitsCardProps) {
  const rankingState = getPlacesRankingState(visits.total, places.topByVisits.length)
  const highestVisitCount = Math.max(
    1,
    ...places.topByVisits.map((place) => place.visitCount),
  )

  return (
    <Card aria-labelledby="visits-places-heading">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="visits-places-heading"
              className="flex items-center gap-2 font-display text-lg leading-snug font-bold tracking-tight"
            >
              <MapPin className="h-5 w-5" />
              Visits &amp; Places
            </h2>
            <CardDescription>
              Your café habits across {places.total} saved {places.total === 1 ? "place" : "places"}
            </CardDescription>
          </div>
          <Link
            to="/visits"
            className="-mx-2 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 lg:min-h-0"
          >
            View visits
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <VisitMetric
            label="Total visits"
            value={visits.total}
            detail="café experiences logged"
            icon={CalendarDays}
          />
          <VisitMetric
            label="This month"
            value={visits.thisMonth}
            detail="visits logged"
            icon={CalendarDays}
          />
          <VisitMetric
            label="Places explored"
            value={places.visited}
            detail={`${places.favorites} saved ${places.favorites === 1 ? "favorite" : "favorites"}`}
            icon={MapPin}
          />
          <VisitMetric
            label="Average rating"
            value={visits.averageRating === null ? "—" : `${visits.averageRating} / 5`}
            detail={`${visits.totalRated} rated ${visits.totalRated === 1 ? "visit" : "visits"}`}
            icon={Star}
          />
        </div>

        {rankingState === "ranked" ? (
          <section aria-labelledby="most-visited-places-heading" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 id="most-visited-places-heading" className="font-display text-base font-bold">
                Most visited places
              </h3>
              {places.favorites > 0 && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Heart className="h-4 w-4 fill-destructive text-destructive" />
                  {places.favorites} saved favorite{places.favorites === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="space-y-4">
              {places.topByVisits.map((place, index) => (
                <div key={place.coffeeShopId} className="flex min-w-0 items-start gap-3">
                  <span className="w-6 shrink-0 text-sm leading-11 font-medium text-muted-foreground lg:leading-normal">
                    #{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <div className="min-w-0">
                        <Link
                          to="/shops/$coffeeShopId"
                          params={{ coffeeShopId: String(place.coffeeShopId) }}
                          className="inline-flex min-h-11 items-center rounded-md py-3 font-medium underline-offset-4 hover:underline lg:min-h-0 lg:py-0"
                        >
                          {place.coffeeShopName}
                        </Link>
                        {place.city && (
                          <span className="ml-2 text-sm text-muted-foreground">{place.city}</span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                        {place.avgRating !== null && (
                          <span className="flex items-center gap-1">
                            {place.avgRating}
                            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                          </span>
                        )}
                        <span className="tabular-nums">
                          {place.visitCount} {place.visitCount === 1 ? "visit" : "visits"}
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={(place.visitCount / highestVisitCount) * 100}
                      className="mt-1.5 h-2"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="rounded-2xl bg-secondary/70 p-4 text-sm text-muted-foreground">
            {RANKING_EMPTY_MESSAGES[rankingState]}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function VisitMetric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  readonly label: string
  readonly value: string | number
  readonly detail: string
  readonly icon: ComponentType<{ readonly className?: string }>
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-secondary/70 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <Icon className="h-5 w-5 shrink-0 text-primary" />
    </div>
  )
}
