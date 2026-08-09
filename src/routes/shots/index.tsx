import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus, Coffee } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EmptyState } from "@/components/EmptyState"
import { ShotsTable } from "@/components/ShotsTable"
import { ShotsViewToggle, groupShotsByBean } from "@/components/shots-overview"
import { ImageWithFallback } from "@/components/image-with-fallback"
import { thumbnailUrl } from "@/lib/image-url"
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
  const [grouped, setGrouped] = useState(false)
  const shotGroups = grouped ? groupShotsByBean(shots) : []

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          {shots.length > 0 && (
            <ShotsViewToggle grouped={grouped} onGroupedChange={setGrouped} />
          )}
          <Button asChild>
            <Link to="/shots/new">
              <Plus className="h-4 w-4" />
              Log a shot
            </Link>
          </Button>
        </div>
      </header>

      {shots.length === 0 ? (
        <EmptyState
          icon={Coffee}
          title="No shots logged yet"
          description="Start tracking your espresso journey"
          actionLabel="Log your first shot"
          actionHref="/shots/new"
        />
      ) : grouped ? (
        <div className="space-y-4">
          {shotGroups.map((group) => {
            const headingId = `shots-${group.key}`
            const thumbnail =
              group.bean?.images?.find((image) => image.isThumbnail) ?? group.bean?.images?.[0]

            return (
              <section key={group.key} aria-labelledby={headingId}>
                <Card>
                  <CardHeader className="items-center gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <ImageWithFallback
                        src={thumbnail ? thumbnailUrl(thumbnail.storagePath) : undefined}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      />
                      <CardTitle id={headingId} className="text-lg leading-tight">
                        {group.bean ? (
                          <Link
                            to="/beans/$beanId"
                            params={{ beanId: String(group.bean.id) }}
                            className="inline-flex min-h-11 items-center rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {group.label}
                          </Link>
                        ) : (
                          group.label
                        )}
                      </CardTitle>
                    </div>
                    <CardAction className="self-center">
                      <span className="text-sm font-semibold text-muted-foreground">
                        {group.shots.length} shot{group.shots.length === 1 ? "" : "s"}
                      </span>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <ShotsTable shots={group.shots} hideBean />
                  </CardContent>
                </Card>
              </section>
            )
          })}
        </div>
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
