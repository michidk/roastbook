import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { ArrowLeft, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getShot, deleteShot } from "@/lib/server/shots"
import { getActiveBeans } from "@/lib/server/beans"
import { getRecipes } from "@/lib/server/recipes"
import { getTasteTags } from "@/lib/server/taste-tags"
import { DeleteConfirmation } from "@/components/DeleteConfirmation"
import { ShotEditForm, type ShotEditData } from "@/components/shots/shot-edit-form"
import { toast } from "sonner"

export const Route = createFileRoute("/shots/$shotId")({
  loader: async ({ params }) => {
    const shotId = Number(params.shotId)
    const shot = await getShot({ data: shotId })
    return { shot }
  },
  component: ShotDetailPage,
})

function ShotDetailPage() {
  const { shot } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()

  const [isEditing, setIsEditing] = useState(false)
  const [isLoadingEditData, setIsLoadingEditData] = useState(false)
  const [editData, setEditData] = useState<ShotEditData | null>(null)
  const editButtonRef = useRef<HTMLButtonElement>(null)

  const handleStartEdit = async () => {
    if (!editData) {
      setIsLoadingEditData(true)
      try {
        const [beans, recipes, tasteTags] = await Promise.all([
          getActiveBeans(),
          getRecipes(),
          getTasteTags(),
        ])
        setEditData({ beans, recipes, tasteTags })
      } finally {
        setIsLoadingEditData(false)
      }
    }
    setIsEditing(true)
  }

  if (!shot) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Shot not found</h2>
        <Button asChild className="mt-4">
          <Link to="/shots">Back to shots</Link>
        </Button>
      </div>
    )
  }

  const handleDelete = async () => {
    try {
      await deleteShot({ data: shot.id })
      navigate({ to: "/shots" })
    } catch {
      toast.error("Failed to delete shot")
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  const handleSaved = async () => {
    await router.invalidate()
    setIsEditing(false)
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  const ratio = shot.doseGrams && shot.yieldGrams
    ? (Number(shot.yieldGrams) / Number(shot.doseGrams)).toFixed(1)
    : null

  const recipeGearNames = shot.recipe?.gear.map((rg) => rg.gear.name).join(", ")

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/shots" aria-label="Back to shots">
            <ArrowLeft aria-hidden className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {shot.bean?.name || "Unknown beans"}
          </h1>
          <p className="text-muted-foreground">
            {new Date(shot.createdAt).toLocaleString()}
          </p>
        </div>
        {!isEditing && (
          <Button ref={editButtonRef} variant="outline" onClick={handleStartEdit} disabled={isLoadingEditData}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
        <DeleteConfirmation
          title="Delete this shot?"
          description="This action cannot be undone."
          onConfirm={handleDelete}
        />
      </div>

      {isEditing && editData ? (
        <ShotEditForm
          shot={shot}
          editData={editData}
          onCancel={handleCancel}
          onSaved={handleSaved}
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Extraction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dose</p>
                  <p className="text-xl font-semibold">{shot.doseGrams || "-"}g</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Yield</p>
                  <p className="text-xl font-semibold">{shot.yieldGrams || "-"}g</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ratio</p>
                  <p className="text-xl font-semibold">{ratio ? `1:${ratio}` : "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="text-xl font-semibold">{shot.brewTimeSeconds || "-"}s</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Grind</p>
                  <p className="font-medium">{shot.grindSetting || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Temperature</p>
                  <p className="font-medium">
                    {shot.waterTempCelsius ? `${shot.waterTempCelsius}°C` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pressure</p>
                  <p className="font-medium">
                    {shot.pressure ? `${shot.pressure} bar` : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recipe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Recipe</p>
                  <p className="font-medium">{shot.recipe?.name || "-"}</p>
                </div>
                {recipeGearNames && (
                  <div>
                    <p className="text-sm text-muted-foreground">Gear</p>
                    <p className="font-medium">{recipeGearNames}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tasting</CardTitle>
                {shot.rating && (
                  <Badge variant="secondary" className="text-lg">
                    {shot.rating}/5
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {shot.tasteTags && shot.tasteTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {shot.tasteTags.map((tt) => (
                    <Badge
                      key={tt.id}
                      variant={tt.tasteTag.category === "negative" ? "destructive" : "default"}
                    >
                      {tt.tasteTag.name}
                    </Badge>
                  ))}
                </div>
              )}

              {shot.notes && (
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap">{shot.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
