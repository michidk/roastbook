import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronDown, Cog, Plus } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { ListPending } from '@/components/route-pending'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  interactiveCardLinkClassName,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { GEAR_TYPE_LABELS } from '@/lib/constants'
import { imageUrl } from '@/lib/image-url'
import { getGear } from '@/lib/server/gear'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/gear/')({
  loader: () => getGear(),
  component: GearPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

function GearPage() {
  const gear = Route.useLoaderData()

  const activeGear = gear.filter((g) => !g.isArchived)
  const archivedGear = gear.filter((g) => g.isArchived)

  return (
    <Page>
      <PageHeader
        title="Gear"
        description="Your coffee equipment"
        actions={
          <Button asChild>
            <Link to="/gear/new">
              <Plus className="h-4 w-4" />
              Add gear
            </Link>
          </Button>
        }
      />

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
              <div
                className={cn(
                  'grid gap-4 sm:grid-cols-2',
                  activeGear.length > 2 && 'lg:grid-cols-3',
                )}
              >
                {activeGear.map((item) => (
                  <GearCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {activeGear.length === 0 && archivedGear.length > 0 && (
            <p className="text-muted-foreground">
              No active gear. Check the archived section below.
            </p>
          )}

          {archivedGear.length > 0 && (
            <Collapsible className="space-y-4">
              <CollapsibleTrigger className="group -mx-2 flex min-h-11 items-center gap-2 rounded-md px-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ChevronDown className="h-4 w-4 transition-transform group-data-[open]:rotate-180" />
                <span className="text-sm font-medium">
                  Archived ({archivedGear.length})
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="@container">
                  <div
                    className={cn(
                      'grid gap-4 sm:grid-cols-2',
                      archivedGear.length > 2 && 'lg:grid-cols-3',
                    )}
                  >
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
    </Page>
  )
}

function GearCard({
  item,
}: {
  item: Awaited<ReturnType<typeof getGear>>[number]
}) {
  const thumbnail = item.images.find((img) => img.isThumbnail) ?? item.images[0]

  return (
    <Link
      to="/gear/$gearId"
      params={{ gearId: String(item.id) }}
      className={interactiveCardLinkClassName}
    >
      <Card className="h-full overflow-hidden transition-colors group-hover:bg-muted/50">
        {thumbnail && (
          <div className="aspect-[4/3] overflow-hidden">
            <ImageWithFallback
              src={imageUrl(thumbnail.storagePath)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="min-w-0 text-base">{item.name}</CardTitle>
            <Badge variant="outline" className="shrink-0 text-xs">
              {GEAR_TYPE_LABELS[item.type]}
            </Badge>
          </div>
          {(item.brand || item.model) && (
            <p className="text-sm text-muted-foreground">
              {[item.brand, item.model].filter(Boolean).join(' ')}
            </p>
          )}
        </CardHeader>
        {item.notes && (
          <CardContent>
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {item.notes}
            </p>
          </CardContent>
        )}
      </Card>
    </Link>
  )
}
