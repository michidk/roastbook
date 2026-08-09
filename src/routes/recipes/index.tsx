import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, ChevronDown } from "lucide-react"
import { RouteError } from "@/components/route-error"
import { ListPending } from "@/components/route-pending"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getAllRecipes } from "@/lib/server/recipes"

export const Route = createFileRoute("/recipes/")({
  loader: () => getAllRecipes(),
  component: RecipesPage,
  pendingComponent: ListPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/" backLabel="Go to dashboard" />
  ),
})

type Recipe = Awaited<ReturnType<typeof getAllRecipes>>[number]

const brewingMethodLabels = {
  espresso: "Espresso",
  pourover: "Pour over",
  aeropress: "AeroPress",
  french_press: "French press",
  moka_pot: "Moka pot",
  cold_brew: "Cold brew",
  other: "Other",
} as const satisfies Record<Recipe["brewingMethod"], string>

function RecipesPage() {
  const recipes = Route.useLoaderData()
  const activeRecipes = recipes.filter((recipe) => !recipe.isArchived)
  const archivedRecipes = recipes.filter((recipe) => recipe.isArchived)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          Recipes
        </h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {recipes.length === 1 ? "1 saved recipe" : `${recipes.length} saved recipes`}
        </p>
      </header>

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No recipes saved yet</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Recipes created while logging a shot will appear here.
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
              <CollapsibleTrigger className="group flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground">
                <ChevronDown className="h-4 w-4 transition-transform group-data-[open]:rotate-180" />
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
  const dose = recipe.defaultDoseGrams ? Number(recipe.defaultDoseGrams) : null
  const targetYield = recipe.defaultYieldGrams
    ? Number(recipe.defaultYieldGrams)
    : null
  const brewRatio = dose && targetYield ? targetYield / dose : null
  const equipment = recipe.gear.map(({ gear }) => gear.name).join(", ")
  const parameters = [
    { label: "Dose", value: dose === null ? null : `${dose.toLocaleString()} g` },
    {
      label: "Target yield",
      value: targetYield === null ? null : `${targetYield.toLocaleString()} g`,
    },
    {
      label: "Brew ratio",
      value: brewRatio === null ? null : `1:${brewRatio.toFixed(1)}`,
    },
    {
      label: "Target shot time",
      value:
        recipe.defaultBrewTimeSeconds === null
          ? null
          : `${recipe.defaultBrewTimeSeconds} s`,
    },
    { label: "Grind setting", value: recipe.defaultGrindSetting },
    {
      label: "Brew temperature",
      value: recipe.defaultWaterTempCelsius
        ? `${Number(recipe.defaultWaterTempCelsius).toLocaleString()} °C`
        : null,
    },
    {
      label: "Target brew pressure",
      value: recipe.defaultPressure
        ? `${Number(recipe.defaultPressure).toLocaleString()} bar`
        : null,
    },
  ] as const
  const hasParameters = parameters.some(({ value }) => value !== null)

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="min-w-0 text-base">{recipe.name}</CardTitle>
          <Badge variant="outline" className="shrink-0">
            {brewingMethodLabels[recipe.brewingMethod]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
    </Card>
  )
}
