import { createFileRoute, Link } from '@tanstack/react-router'
import { BookOpen } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Page, PageHeader } from '@/components/page-layout'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  interactiveCardLinkClassName,
} from '@/components/ui/card'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { getRecipes } from '@/lib/server/recipes'

export const Route = createFileRoute('/recipes/')({
  loader: () => getRecipes(),
  component: RecipesPage,
})

function RecipesPage() {
  const recipes = Route.useLoaderData()
  const formatNumber = useNumberFormatter()

  return (
    <Page>
      <PageHeader
        title="Recipes"
        description="Reusable shot values, organized by brewing method."
      />

      {recipes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No recipes yet"
          description="Open any saved shot and choose “Save as recipe”."
          actionLabel="Browse shots"
          actionHref="/shots"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              to="/recipes/$recipeId"
              params={{ recipeId: String(recipe.id) }}
              className={interactiveCardLinkClassName}
            >
              <Card className="h-full transition-colors group-hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle as="h2" className="min-w-0 text-base">
                      {recipe.name}
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {recipe.brewingMethod.name}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {recipe.bean?.name ?? 'Any beans'}
                  </p>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {recipe.brewingMethod.enabledParameters.includes(
                    'doseGrams',
                  ) && recipe.doseGrams ? (
                    <p>{formatNumber(recipe.doseGrams)} g dose</p>
                  ) : null}
                  {recipe.brewingMethod.enabledParameters.includes(
                    'yieldGrams',
                  ) && recipe.yieldGrams ? (
                    <p>{formatNumber(recipe.yieldGrams)} g yield</p>
                  ) : null}
                  {recipe.brewingMethod.enabledParameters.includes(
                    'shotTimeSeconds',
                  ) && recipe.shotTimeSeconds ? (
                    <p>{formatNumber(recipe.shotTimeSeconds)} s</p>
                  ) : null}
                  {recipe.brewingMethod.enabledParameters.includes(
                    'grindSetting',
                  ) && recipe.grindSetting ? (
                    <p>Grind {recipe.grindSetting}</p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Page>
  )
}
