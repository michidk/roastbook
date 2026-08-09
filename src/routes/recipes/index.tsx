import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowUpRight, BookOpen, ChevronDown, Plus } from "lucide-react"
import { RouteError } from "@/components/route-error"
import { ListPending } from "@/components/route-pending"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getAllRecipes } from "@/lib/server/recipes"
import { BREWING_METHOD_LABELS } from "@/lib/recipes"

export const Route = createFileRoute("/recipes/")({
  loader: () => getAllRecipes(),
  component: RecipesPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

type Recipe = Awaited<ReturnType<typeof getAllRecipes>>[number]

function RecipesPage() {
  const recipes = Route.useLoaderData()
  const activeRecipes = recipes.filter((recipe) => !recipe.isArchived)
  const archivedRecipes = recipes.filter((recipe) => recipe.isArchived)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">Recipes</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">{recipes.length === 1 ? "1 saved recipe" : `${recipes.length} saved recipes`}</p>
        </div>
        <Button asChild><Link to="/recipes/new"><Plus />Add recipe</Link></Button>
      </header>

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No recipes saved yet</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Start with a beginner preset or build a custom brew.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeRecipes.length > 0 ? (
            <section className="space-y-3" aria-labelledby="active-recipes-heading">
              <h2
                id="active-recipes-heading"
                className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground"
              >
                Active · {activeRecipes.length}
              </h2>
              <RecipeGrid recipes={activeRecipes} />
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active recipes. Check the archived section below.
            </p>
          )}

          {archivedRecipes.length > 0 && (
            <Collapsible className="space-y-4">
              <CollapsibleTrigger className="group -mx-2 flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ChevronDown className="h-4 w-4 transition-transform group-data-[open]:rotate-180 motion-reduce:transition-none" />
                Archived ({archivedRecipes.length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                <RecipeGrid recipes={archivedRecipes} />
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  )
}

function RecipeGrid({ recipes }: { readonly recipes: readonly Recipe[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  )
}

function RecipeCard({ recipe }: { readonly recipe: Recipe }) {
  const enabled = new Set(recipe.enabledFields.map(({ fieldKey }) => fieldKey))
  const dose = recipe.targetDoseGrams ? Number(recipe.targetDoseGrams) : null
  const targetYield = recipe.targetYieldGrams
    ? Number(recipe.targetYieldGrams)
    : null
  const brewRatio = dose && targetYield ? targetYield / dose : null
  const equipment = recipe.gear.map(({ gear }) => gear.name).join(", ")
  const parameters = [
    { label: "Dose", value: enabled.has("target_dose") && dose !== null ? `${dose.toLocaleString()} g` : null },
    {
      label: "Target yield",
      value: enabled.has("target_yield") && targetYield !== null ? `${targetYield.toLocaleString()} g` : null,
    },
    {
      label: "Brew ratio",
      value: enabled.has("brew_ratio") && brewRatio !== null ? `1:${brewRatio.toFixed(1)}` : null,
    },
    {
      label: "Target shot time",
      value:
        !enabled.has("target_time") || recipe.targetTimeMinSeconds === null
          ? null
          : recipe.targetTimeMinSeconds === recipe.targetTimeMaxSeconds
            ? `${Number(recipe.targetTimeMinSeconds).toLocaleString()} s`
            : `${Number(recipe.targetTimeMinSeconds).toLocaleString()}–${Number(recipe.targetTimeMaxSeconds).toLocaleString()} s`,
    },
    { label: "Grind setting", value: enabled.has("grind_setting") ? recipe.grindSetting : null },
    {
      label: "Brew temperature",
      value: enabled.has("brew_temperature") && recipe.brewTemperatureCelsius
        ? `${Number(recipe.brewTemperatureCelsius).toLocaleString()} °C`
        : null,
    },
    {
      label: "Target brew pressure",
      value: enabled.has("target_pressure") && recipe.targetBrewPressureBar
        ? `${Number(recipe.targetBrewPressureBar).toLocaleString()} bar`
        : null,
    },
  ] as const
  const hasParameters = parameters.some(({ value }) => value !== null)

  return (
    <Card className="h-full overflow-hidden p-0 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-coffee-strong motion-reduce:transform-none motion-reduce:transition-none">
      <Link
        to="/recipes/$recipeId"
        params={{ recipeId: String(recipe.id) }}
        aria-label={`Open recipe ${recipe.name}`}
        className="flex h-full flex-col rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <CardHeader className="p-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle as="h3" className="min-w-0 text-base">
              {recipe.name}
            </CardTitle>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline">
                {BREWING_METHOD_LABELS[recipe.brewingMethod]}
              </Badge>
              <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-4 p-5 pt-0">
        {hasParameters ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {parameters.map(({ label, value }) =>
              value === null ? null : (
                <div key={label} className="min-w-0">
                  <dt className="text-xs font-semibold text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                    {value}
                  </dd>
                </div>
              ),
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            No brew parameters saved.
          </p>
        )}

        {equipment && (
          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground">Equipment</p>
            <p className="mt-0.5 text-sm text-foreground">{equipment}</p>
          </div>
        )}

        {recipe.notes && (
          <p className="border-t border-border pt-3 text-sm text-muted-foreground">
            {recipe.notes}
          </p>
        )}
        </CardContent>
      </Link>
    </Card>
  )
}
