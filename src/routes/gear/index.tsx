import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus, Cog, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getGear } from "@/lib/server/gear"
import { RouteError } from "@/components/route-error"
import { ListPending } from "@/components/route-pending"
import { EmptyState } from "@/components/EmptyState"

export const Route = createFileRoute("/gear/")({
  loader: () => getGear(),
  component: GearPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

const typeLabels: Record<string, string> = {
  espresso_machine: "Espresso Machine",
  grinder: "Grinder",
  kettle: "Kettle",
  scale: "Scale",
  tamper: "Tamper",
  wdt: "WDT Tool",
  other: "Other",
}

function GearPage() {
  const gear = Route.useLoaderData()

  const activeGear = gear.filter((g) => !g.isArchived)
  const archivedGear = gear.filter((g) => g.isArchived)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Gear
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Your coffee equipment
          </p>
        </div>
        <Button asChild>
          <Link to="/gear/new">
            <Plus className="h-4 w-4" />
            Add gear
          </Link>
        </Button>
      </header>

      {gear.length === 0 ? (
        <EmptyState
          icon={Cog}
          title="No gear added yet"
          description="Add your espresso machine, grinder, and other equipment"
          actionLabel="Add gear"
          actionHref="/gear/new"
        />
      ) : (
        <>
          {activeGear.length > 0 && (
            <div className="@container">
              <div className="grid gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
                {activeGear.map((item) => (
                  <GearCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {activeGear.length === 0 && archivedGear.length > 0 && (
            <p className="text-muted-foreground">No active gear. Check the archived section below.</p>
          )}

          {archivedGear.length > 0 && (
            <Collapsible className="space-y-4">
              <CollapsibleTrigger className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
                <ChevronDown className="h-4 w-4 transition-transform group-data-[open]:rotate-180" />
                <span className="text-sm font-medium">
                  Archived ({archivedGear.length})
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="@container">
                  <div className="grid gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
                    {archivedGear.map((item) => (
                      <GearCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  )
}

function GearCard({ item }: { item: Awaited<ReturnType<typeof getGear>>[number] }) {
  const thumbnail = item.images.find((img) => img.isThumbnail) ?? item.images[0]
  const baseUrl = import.meta.env.VITE_STORAGE_URL || "/uploads"

  return (
    <Link to="/gear/$gearId" params={{ gearId: String(item.id) }}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full overflow-hidden">
        {thumbnail && (
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={`${baseUrl}/${thumbnail.storagePath}`}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base line-clamp-1">{item.name}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {typeLabels[item.type]}
            </Badge>
          </div>
          {(item.brand || item.model) && (
            <p className="text-sm text-muted-foreground">
              {[item.brand, item.model].filter(Boolean).join(" ")}
            </p>
          )}
        </CardHeader>
        {item.notes && (
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {item.notes}
            </p>
          </CardContent>
        )}
      </Card>
    </Link>
  )
}
