import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { RecipeForm } from "@/components/recipes/recipe-form"
import { Button } from "@/components/ui/button"
import { getActiveBeans } from "@/lib/server/beans"
import { getActiveGearByType, getGear } from "@/lib/server/gear"

export const Route = createFileRoute("/recipes/new")({
  loader: async () => {
    const [beans, grinders, baskets, allGear] = await Promise.all([
      getActiveBeans(),
      getActiveGearByType({ data: "grinder" }),
      getActiveGearByType({ data: "basket" }),
      getGear(),
    ])
    return {
      beans,
      grinders,
      baskets,
      accessories: allGear.filter(({ isArchived }) => !isArchived),
    }
  },
  component: NewRecipePage,
})

function NewRecipePage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/recipes" aria-label="Back to recipes"><ArrowLeft /></Link>
        </Button>
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Add recipe</h1>
          <p className="text-sm font-semibold text-muted-foreground">Start simple, then keep only the fields you use.</p>
        </div>
      </header>
      <RecipeForm
        {...data}
        requireBean
        onCancel={() => navigate({ to: "/recipes" })}
        onCreated={(recipe) => navigate({ to: "/recipes/$recipeId", params: { recipeId: String(recipe.id) } })}
      />
    </div>
  )
}
