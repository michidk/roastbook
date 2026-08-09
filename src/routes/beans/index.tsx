import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus, Bean, ChevronDown } from "lucide-react"
import { BeanCard } from "@/components/beans/bean-card"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getBeans } from "@/lib/server/beans"
import { RouteError } from "@/components/route-error"
import { ListPending } from "@/components/route-pending"
import { EmptyState } from "@/components/EmptyState"

export const Route = createFileRoute("/beans/")({
  loader: () => getBeans(),
  component: BeansPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

function BeansPage() {
  const beans = Route.useLoaderData()
  const activeBeans = beans.filter((b) => !b.isArchived)
  const archivedBeans = beans.filter((b) => b.isArchived)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Beans
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Your coffee bean collection
          </p>
        </div>
        <Button asChild>
          <Link to="/beans/new">
            <Plus className="h-4 w-4" />
            Add beans
          </Link>
        </Button>
      </header>

      {beans.length === 0 ? (
        <EmptyState
          icon={Bean}
          title="No beans added yet"
          description="Start by adding your first bag of coffee"
          actionLabel="Add beans"
          actionHref="/beans/new"
        />
      ) : (
        <>
          {activeBeans.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Active · {activeBeans.length}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {activeBeans.map((bean) => (
                  <BeanCard key={bean.id} bean={bean} />
                ))}
              </div>
            </section>
          )}

          {activeBeans.length === 0 && archivedBeans.length > 0 && (
            <p className="text-sm text-muted-foreground">
              No active beans. Check the archived section below.
            </p>
          )}

          {archivedBeans.length > 0 && (
            <Collapsible className="space-y-4">
              <CollapsibleTrigger className="group -mx-2 flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ChevronDown className="h-4 w-4 transition-transform group-data-[open]:rotate-180" />
                Archived ({archivedBeans.length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedBeans.map((bean) => (
                    <BeanCard key={bean.id} bean={bean} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  )
}
