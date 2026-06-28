import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useEffect, useMemo, useState, type FormEvent } from "react"
import { ArrowLeft, Pencil, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getShot, deleteShot, updateShot } from "@/lib/server/shots"
import { getActiveBeans } from "@/lib/server/beans"
import { getRecipes } from "@/lib/server/recipes"
import { getTasteTags } from "@/lib/server/taste-tags"
import { cn } from "@/lib/utils"
import { DeleteConfirmation } from "@/components/DeleteConfirmation"
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
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingEditData, setIsLoadingEditData] = useState(false)
  const [editData, setEditData] = useState<{
    beans: Awaited<ReturnType<typeof getActiveBeans>>
    recipes: Awaited<ReturnType<typeof getRecipes>>
    tasteTags: Awaited<ReturnType<typeof getTasteTags>>
  } | null>(null)

  const negativeTags = editData?.tasteTags.filter((tag) => tag.category === "negative") ?? []
  const positiveTags = editData?.tasteTags.filter((tag) => tag.category === "positive") ?? []

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

  const initialFormData = useMemo(
    () => ({
      beanId: shot?.beanId ? String(shot.beanId) : "",
      recipeId: shot?.recipeId ? String(shot.recipeId) : "",
      doseGrams: shot?.doseGrams ?? "",
      yieldGrams: shot?.yieldGrams ?? "",
      brewTimeSeconds:
        shot?.brewTimeSeconds !== null && shot?.brewTimeSeconds !== undefined
          ? String(shot.brewTimeSeconds)
          : "",
      grindSetting: shot?.grindSetting ?? "",
      waterTempCelsius: shot?.waterTempCelsius ?? "",
      pressure: shot?.pressure ?? "",
      rating: shot?.rating ?? 0,
      notes: shot?.notes ?? "",
      tasteTagIds: shot?.tasteTags.map((tag) => tag.tasteTagId) ?? [],
    }),
    [shot]
  )

  const [formData, setFormData] = useState(initialFormData)

  useEffect(() => {
    setFormData(initialFormData)
  }, [initialFormData])

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
    setFormData(initialFormData)
    setIsEditing(false)
  }

  const toggleTag = (tagId: number) => {
    setFormData((prev) => ({
      ...prev,
      tasteTagIds: prev.tasteTagIds.includes(tagId)
        ? prev.tasteTagIds.filter((id) => id !== tagId)
        : [...prev.tasteTagIds, tagId],
    }))
  }

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await updateShot({
        data: {
          id: shot.id,
          beanId: formData.beanId ? Number(formData.beanId) : null,
          recipeId: formData.recipeId ? Number(formData.recipeId) : null,
          doseGrams: formData.doseGrams || null,
          yieldGrams: formData.yieldGrams || null,
          brewTimeSeconds: formData.brewTimeSeconds
            ? Number(formData.brewTimeSeconds)
            : null,
          grindSetting: formData.grindSetting || null,
          waterTempCelsius: formData.waterTempCelsius || null,
          pressure: formData.pressure || null,
          rating: formData.rating || null,
          notes: formData.notes || null,
          tasteTagIds: formData.tasteTagIds,
        },
      })

      await router.invalidate()
      setIsEditing(false)
    } catch {
      toast.error("Failed to update shot")
    } finally {
      setIsSaving(false)
    }
  }

  const ratio = shot.doseGrams && shot.yieldGrams
    ? (Number(shot.yieldGrams) / Number(shot.doseGrams)).toFixed(1)
    : null

  const recipeGearNames = shot.recipe?.gear.map((rg) => rg.gear.name).join(", ")

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/shots">
            <ArrowLeft className="h-4 w-4" />
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
          <Button variant="outline" onClick={handleStartEdit} disabled={isLoadingEditData}>
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

      {isEditing ? (
        <form id="shot-edit-form" onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Beans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bean">Select Beans</Label>
                <Select
                  value={formData.beanId || undefined}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, beanId: value ?? "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select beans" />
                  </SelectTrigger>
                  <SelectContent>
                    {(editData?.beans ?? []).map((bean) => (
                      <SelectItem key={bean.id} value={String(bean.id)}>
                        {bean.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipe">Select Recipe</Label>
                <Select
                  value={formData.recipeId || undefined}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, recipeId: value ?? "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {(editData?.recipes ?? []).map((recipe) => (
                      <SelectItem key={recipe.id} value={String(recipe.id)}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Extraction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="dose">Dose (g)</Label>
                  <Input
                    id="dose"
                    inputMode="decimal"
                    placeholder="18.0"
                    value={formData.doseGrams}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, doseGrams: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yield">Yield (g)</Label>
                  <Input
                    id="yield"
                    inputMode="decimal"
                    placeholder="36.0"
                    value={formData.yieldGrams}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, yieldGrams: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grindSetting">Grind Setting</Label>
                  <Input
                    id="grindSetting"
                    placeholder="e.g., 15"
                    value={formData.grindSetting}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, grindSetting: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brewTime">Brew Time (seconds)</Label>
                <Input
                  id="brewTime"
                  inputMode="numeric"
                  placeholder="30"
                  value={formData.brewTimeSeconds}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      brewTimeSeconds: e.target.value.replace(/[^0-9]/g, ""),
                    }))
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="temp">Water Temp (°C)</Label>
                  <Input
                    id="temp"
                    inputMode="decimal"
                    placeholder="93.0"
                    value={formData.waterTempCelsius}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        waterTempCelsius: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pressure">Pressure (bar)</Label>
                  <Input
                    id="pressure"
                    inputMode="decimal"
                    placeholder="9.0"
                    value={formData.pressure}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, pressure: e.target.value }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasting Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          rating: prev.rating === star ? 0 : star,
                        }))
                      }
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          "size-6",
                          star <= formData.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {negativeTags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-destructive">Issues</Label>
                  <div className="flex flex-wrap gap-2">
                    {negativeTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={formData.tasteTagIds.includes(tag.id) ? "destructive" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          formData.tasteTagIds.includes(tag.id)
                            ? ""
                            : "hover:bg-destructive/10"
                        )}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {positiveTags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-primary">Positives</Label>
                  <div className="flex flex-wrap gap-2">
                    {positiveTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={formData.tasteTagIds.includes(tag.id) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          formData.tasteTagIds.includes(tag.id)
                            ? ""
                            : "hover:bg-primary/10"
                        )}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="How was it? Any observations?"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="flex-1">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
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
