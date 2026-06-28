import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus, Coffee } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/EmptyState"
import { ShotsTable } from "@/components/ShotsTable"
import { getShots } from "@/lib/server/shots"
import { RouteError } from "@/components/route-error"
import { ListPending } from "@/components/route-pending"

export const Route = createFileRoute("/shots/")({
  loader: () => getShots(),
  component: ShotsPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

function ShotsPage() {
  const shots = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Shots
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Your espresso shot history
          </p>
        </div>
        <Button asChild>
          <Link to="/shots/new">
            <Plus className="h-4 w-4" />
            Log a shot
          </Link>
        </Button>
      </header>

      {shots.length === 0 ? (
        <EmptyState
          icon={Coffee}
          title="No shots logged yet"
          description="Start tracking your espresso journey"
          actionLabel="Log your first shot"
          actionHref="/shots/new"
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ShotsTable shots={shots} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
