import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Plus, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getRoasters } from "@/lib/server/roasters"
import { RouteError } from "@/components/route-error"
import { ListPending } from "@/components/route-pending"
import { EmptyState } from "@/components/EmptyState"

export const Route = createFileRoute("/roasters/")({
  loader: () => getRoasters(),
  component: RoastersPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

type Roaster = Awaited<ReturnType<typeof getRoasters>>[number]

function RoastersPage() {
  const roasters = Route.useLoaderData()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Roasters
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Coffee roasters you buy from
          </p>
        </div>
        <Button asChild>
          <Link to="/roasters/new">
            <Plus className="h-4 w-4" />
            Add roaster
          </Link>
        </Button>
      </header>

      {roasters.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No roasters added yet"
          description="Start by adding your favorite coffee roasters"
          actionLabel="Add roaster"
          actionHref="/roasters/new"
        />
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Beans</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roasters.map((roaster) => (
                  <RoasterRow
                    key={roaster.id}
                    roaster={roaster}
                    onSelect={() =>
                      navigate({
                        to: "/roasters/$roasterId",
                        params: { roasterId: String(roaster.id) },
                      })
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function RoasterRow({
  roaster,
  onSelect,
}: {
  roaster: Roaster
  onSelect: () => void
}) {
  const beanCount = roaster.beans?.length ?? 0
  const location = [roaster.location, roaster.country].filter(Boolean).join(", ")

  return (
    <TableRow className="cursor-pointer" onClick={onSelect}>
      <TableCell className="font-display font-bold text-foreground">
        {roaster.name}
      </TableCell>
      <TableCell className="text-muted-foreground">{location || "—"}</TableCell>
      <TableCell className="text-right">
        {beanCount > 0 ? (
          <Badge variant="secondary">{beanCount}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="max-w-[420px] truncate text-muted-foreground">
        {roaster.notes || "—"}
      </TableCell>
    </TableRow>
  )
}
