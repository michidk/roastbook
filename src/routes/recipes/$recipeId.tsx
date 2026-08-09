import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Copy,
  Pencil,
  Trash2,
} from "lucide-react"
import { DeleteConfirmation } from "@/components/DeleteConfirmation"
import { RecipeForm } from "@/components/recipes/recipe-form"
import { RouteError } from "@/components/route-error"
import { DetailPending } from "@/components/route-pending"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BREWING_METHOD_LABELS } from "@/lib/recipes"
import {
  deleteRecipe,
  duplicateRecipe,
  getRecipe,
  setRecipeArchived,
} from "@/lib/server/recipes"

export const Route = createFileRoute("/recipes/$recipeId")({
  loader: ({ params }) => getRecipe({ data: Number(params.recipeId) }),
  component: RecipeDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/recipes" backLabel="Back to recipes" />
  ),
})

function RecipeDetailPage() {
  const recipe = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [pendingAction, setPendingAction] = useState<
    "archive" | "duplicate" | null
  >(null)

  if (!recipe) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <h1 className="font-display text-xl font-bold">Recipe not found</h1>
          <Button asChild className="mt-4">
            <Link to="/recipes">Back to recipes</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const handleArchive = async () => {
    setPendingAction("archive")
    try {
      await setRecipeArchived({
        data: { id: recipe.id, isArchived: !recipe.isArchived },
      })
      await router.invalidate()
      toast.success(recipe.isArchived ? "Recipe restored" : "Recipe archived")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update this recipe",
      )
    } finally {
      setPendingAction(null)
    }
  }

  const handleDuplicate = async () => {
    setPendingAction("duplicate")
    try {
      const copy = await duplicateRecipe({ data: recipe.id })
      if (!copy) {
        toast.error("Could not find the recipe to duplicate")
        return
      }
      toast.success("Recipe duplicated")
      await navigate({
        to: "/recipes/$recipeId",
        params: { recipeId: String(copy.id) },
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not duplicate this recipe",
      )
    } finally {
      setPendingAction(null)
    }
  }

  const handleDelete = async () => {
    await deleteRecipe({ data: recipe.id })
    toast.success("Recipe deleted")
    await navigate({ to: "/recipes" })
  }

  const equipment = recipe.gear.map(({ gear }) => gear.name).join(", ")
  const enabled = new Set(recipe.enabledFields.map(({ fieldKey }) => fieldKey))
  const parameters = [
    ["Dose", enabled.has("target_dose") ? recipe.targetDoseGrams ? `${Number(recipe.targetDoseGrams)} g` : "Not set" : null],
    ["Brew water", enabled.has("brew_water") ? recipe.brewWaterGrams ? `${Number(recipe.brewWaterGrams)} g` : "Not set" : null],
    ["Target yield", enabled.has("target_yield") ? recipe.targetYieldGrams ? `${Number(recipe.targetYieldGrams)} g` : "Not set" : null],
    [
      "Target shot time",
      enabled.has("target_time")
        ? recipe.targetTimeMinSeconds === null
          ? "Not set"
          : recipe.targetTimeMinSeconds === recipe.targetTimeMaxSeconds
            ? `${Number(recipe.targetTimeMinSeconds)} s`
            : `${Number(recipe.targetTimeMinSeconds)}–${Number(recipe.targetTimeMaxSeconds)} s`
        : null,
    ],
    ["Grind setting", enabled.has("grind_setting") ? recipe.grindSetting ?? "Not set" : null],
    [
      "Brew temperature",
      enabled.has("brew_temperature")
        ? recipe.brewTemperatureCelsius ? `${Number(recipe.brewTemperatureCelsius)} °C` : "Not set"
        : null,
    ],
    [
      "Target brew pressure",
      enabled.has("target_pressure")
        ? recipe.targetBrewPressureBar ? `${Number(recipe.targetBrewPressureBar)} bar` : "Not set"
        : null,
    ],
  ] as const

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start gap-4">
        <Button
          variant="outline"
          size="icon"
          asChild
          className="shrink-0 sm:size-11"
        >
          <Link to="/recipes" aria-label="Back to recipes">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              {recipe.name}
            </h1>
            <Badge variant="outline">
              {BREWING_METHOD_LABELS[recipe.brewingMethod]}
            </Badge>
            {recipe.isArchived && <Badge variant="secondary">Archived</Badge>}
          </div>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Saved brewing defaults and preparation notes
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="sm:h-11"
            onClick={handleArchive}
            disabled={pendingAction !== null}
          >
            {recipe.isArchived ? <ArchiveRestore /> : <Archive />}
            {pendingAction === "archive"
              ? "Saving…"
              : recipe.isArchived
                ? "Unarchive"
                : "Archive"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="sm:h-11"
            onClick={handleDuplicate}
            disabled={pendingAction !== null}
          >
            <Copy />
            {pendingAction === "duplicate" ? "Duplicating…" : "Duplicate"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="sm:h-11"
            onClick={() => setIsEditing((current) => !current)}
          >
            <Pencil />
            {isEditing ? "Close editor" : "Edit"}
          </Button>
          <DeleteConfirmation
            title="Delete this recipe?"
            description="The recipe will be removed from your library. Existing shot records will be kept, but will no longer reference it."
            onConfirm={handleDelete}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="text-destructive sm:h-11"
              >
                <Trash2 />
                Delete
              </Button>
            }
          />
        </div>
      </header>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle as="h2">Edit recipe</CardTitle>
          </CardHeader>
          <CardContent>
            <RecipeForm
              mode="edit"
              recipe={recipe}
              onCancel={() => setIsEditing(false)}
              onSaved={async () => {
                setIsEditing(false)
                await router.invalidate()
                toast.success("Recipe updated")
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Brewing defaults</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {parameters.map(([label, value]) => value === null ? null : (
                  <div key={label}>
                    <dt className="text-sm font-semibold text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 font-display text-lg font-bold tabular-nums">
                      {value ?? "Not set"}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {equipment && (
              <Card>
                <CardHeader>
                  <CardTitle as="h2">Equipment</CardTitle>
                </CardHeader>
                <CardContent>{equipment}</CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle as="h2">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {recipe.notes || "No preparation notes saved."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
