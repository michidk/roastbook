import { createFileRoute, Link } from '@tanstack/react-router'
import { Layers, Plus } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
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
import { getGearSets } from '@/lib/server/gear-sets'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/gear-sets/')({
  loader: () => getGearSets(),
  component: GearSetsPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

function GearSetsPage() {
  const gearSets = Route.useLoaderData()

  return (
    <Page>
      <PageHeader
        title="Gear sets"
        description="Reusable equipment setups you can load into a brew"
        actions={
          <Button asChild>
            <Link to="/gear-sets/new">
              <Plus className="h-4 w-4" />
              Add gear set
            </Link>
          </Button>
        }
      />

      {gearSets.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No gear sets yet"
          description="Group the equipment you use together — at work, at home, or when traveling — and load it into new brews with one tap"
          actionLabel="Add gear set"
          actionHref="/gear-sets/new"
        />
      ) : (
        <div className="@container">
          <div
            className={cn(
              'grid gap-3 sm:grid-cols-2 sm:gap-4',
              gearSets.length > 2 && 'lg:grid-cols-3',
            )}
          >
            {gearSets.map((gearSet) => (
              <GearSetCard key={gearSet.id} gearSet={gearSet} />
            ))}
          </div>
        </div>
      )}
    </Page>
  )
}

function GearSetCard({
  gearSet,
}: {
  gearSet: Awaited<ReturnType<typeof getGearSets>>[number]
}) {
  const members = [
    gearSet.machine,
    gearSet.grinder,
    gearSet.basket,
    ...gearSet.accessoryGear,
  ].filter((member) => member !== null)

  return (
    <Link
      to="/gear-sets/$gearSetId"
      params={{ gearSetId: String(gearSet.id) }}
      className={interactiveCardLinkClassName}
    >
      <Card className="h-full transition-colors group-hover:bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="min-w-0 text-base">{gearSet.name}</CardTitle>
          {gearSet.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {gearSet.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {members.map((member) => (
                <Badge
                  key={member.id}
                  variant="outline"
                  className="max-w-full text-xs"
                >
                  <span className="truncate">{member.name}</span>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No gear selected</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
