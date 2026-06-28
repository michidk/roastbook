import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus, UtensilsCrossed, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/EmptyState"
import { getCafeVisits } from "@/lib/server/cafe-visits"
import { RouteError } from "@/components/route-error"
import { ListPending } from "@/components/route-pending"

export const Route = createFileRoute("/visits/")({
  loader: () => getCafeVisits(),
  component: VisitsPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

type Visit = Awaited<ReturnType<typeof getCafeVisits>>[number]

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
})

function VisitsPage() {
  const visits = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Café visits
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Your coffee experiences out and about
          </p>
        </div>
        <Button asChild>
          <Link to="/visits/new" search={{ placeId: undefined }}>
            <Plus className="h-4 w-4" />
            Log a visit
          </Link>
        </Button>
      </header>

      {visits.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No visits logged yet"
          description="Track your cafe visits and coffee experiences"
          actionLabel="Log a visit"
          actionHref="/visits/new"
          actionSearch={{ placeId: undefined }}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visits.map((visit) => (
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </div>
      )}
    </div>
  )
}

function VisitCard({ visit }: { visit: Visit }) {
  const date = dateFormatter.format(new Date(visit.visitedAt))
  const positiveTags = visit.tasteTags?.filter((tt) => tt.tasteTag.category !== "negative") ?? []
  const negativeTags = visit.tasteTags?.filter((tt) => tt.tasteTag.category === "negative") ?? []

  return (
    <Link
      to="/visits/$visitId"
      params={{ visitId: String(visit.id) }}
      className="block rounded-3xl bg-card p-5 shadow-[0_8px_24px_-18px_rgba(60,42,30,0.45)] transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-foreground">
            {visit.drinkName || "Coffee"}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {visit.place?.name ?? "Unknown café"} · {date}
          </p>
        </div>
        {visit.drinkType && (
          <span className="shrink-0 rounded-xl bg-coffee px-2.5 py-1 text-xs font-bold text-coffee-foreground">
            {visit.drinkType}
          </span>
        )}
      </div>

      {visit.rating != null && (
        <div className="mt-3 flex items-center gap-0.5 text-primary">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className="h-4 w-4"
              fill={n <= visit.rating! ? "currentColor" : "transparent"}
              strokeWidth={1.5}
            />
          ))}
        </div>
      )}

      {(visit.bean || visit.price) && (
        <p className="mt-3 text-sm text-muted-foreground">
          {visit.bean && (
            <>
              Bean: <span className="font-bold text-foreground">{visit.bean.name}</span>
            </>
          )}
          {visit.bean && visit.price && " · "}
          {visit.price && (
            <span className="font-bold text-foreground">
              {(visit.currency || "EUR")} {visit.price}
            </span>
          )}
        </p>
      )}

      {(positiveTags.length > 0 || negativeTags.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {positiveTags.slice(0, 4).map((tt) => (
            <span
              key={tt.id}
              className="rounded-xl bg-[#EAF0DC] px-2.5 py-1 text-xs font-semibold text-[#6B8A3D]"
            >
              {tt.tasteTag.name}
            </span>
          ))}
          {negativeTags.slice(0, 2).map((tt) => (
            <span
              key={tt.id}
              className="rounded-xl bg-[#F8E2DA] px-2.5 py-1 text-xs font-semibold text-[#C0573A]"
            >
              {tt.tasteTag.name}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
