import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StarRating } from "@/components/ui/star-rating"
import { InputField, TextareaField } from "@/components/FormField"
import { getActiveBeans } from "@/lib/server/beans"
import { getRecipes } from "@/lib/server/recipes"
import { getTasteTags } from "@/lib/server/taste-tags"
import {
  createShot,
  getPreviousShotBySetup,
  getPrefillRecipe,
  getRecentlyUsedBeans,
} from "@/lib/server/shots"
import { cn } from "@/lib/utils"
import { ArrowLeft, Play, Pause, RotateCcw, History } from "lucide-react"

const SHOT_TARGET_SECONDS = 30

export const Route = createFileRoute("/shots/new")({
  loader: async () => {
    const [beans, recipes, tasteTags, recentBeans] = await Promise.all([
      getActiveBeans(),
      getRecipes(),
      getTasteTags(),
      getRecentlyUsedBeans(),
    ])
    return { beans, recipes, tasteTags, recentBeans }
  },
  component: NewShotPage,
})

function NewShotPage() {
  const { beans, recipes, tasteTags, recentBeans } = Route.useLoaderData()
  const navigate = useNavigate()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerInterval, setTimerIntervalState] = useState<NodeJS.Timeout | null>(null)

  const [formData, setFormData] = useState({
    beanId: "",
    recipeId: "",
    doseGrams: "",
    yieldGrams: "",
    grindSetting: "",
    waterTempCelsius: "",
    pressure: "",
    rating: 3,
    notes: "",
  })

  const startTimer = () => {
    if (isTimerRunning) return
    setIsTimerRunning(true)
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1)
    }, 1000)
    setTimerIntervalState(interval)
  }

  const stopTimer = () => {
    if (!isTimerRunning) return
    setIsTimerRunning(false)
    if (timerInterval) {
      clearInterval(timerInterval)
      setTimerIntervalState(null)
    }
  }

  const resetTimer = () => {
    stopTimer()
    setTimerSeconds(0)
  }

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleBeanSelect = async (beanId: string | null) => {
    const id = beanId ?? ""
    setFormData((prev) => ({ ...prev, beanId: id }))
    if (id) {
      const recipeId = await getPrefillRecipe({ data: Number(id) })
      if (recipeId) {
        setFormData((prev) => ({ ...prev, beanId: id, recipeId: String(recipeId) }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await createShot({
        data: {
          beanId: formData.beanId ? Number(formData.beanId) : undefined,
          recipeId: formData.recipeId ? Number(formData.recipeId) : undefined,
          doseGrams: formData.doseGrams || undefined,
          yieldGrams: formData.yieldGrams || undefined,
          brewTimeSeconds: timerSeconds || undefined,
          grindSetting: formData.grindSetting || undefined,
          waterTempCelsius: formData.waterTempCelsius || undefined,
          pressure: formData.pressure || undefined,
          rating: formData.rating,
          notes: formData.notes || undefined,
          tasteTagIds: selectedTags.length > 0 ? selectedTags : undefined,
        },
      })
      navigate({ to: "/shots" })
    } catch {
      toast.error("Could not save this shot")
    } finally {
      setIsSubmitting(false)
    }
  }

  const negativeTags = tasteTags.filter((t) => t.category === "negative")
  const positiveTags = tasteTags.filter((t) => t.category === "positive")

  const selectedRecipe = recipes.find((r) => String(r.id) === formData.recipeId)

  const dose = parseFloat(formData.doseGrams) || 0
  const yieldG = parseFloat(formData.yieldGrams) || 0
  const ratio = dose > 0 ? yieldG / dose : 0
  const flow = timerSeconds > 0 && yieldG > 0 ? yieldG / timerSeconds : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link to="/shots">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          New shot
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start"
      >
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Beans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentBeans.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Recently used
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {recentBeans.map((bean) => {
                      const isSelected = String(bean.id) === formData.beanId
                      return (
                        <button
                          key={bean.id}
                          type="button"
                          onClick={() => handleBeanSelect(String(bean.id))}
                          className={cn(
                            "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "border border-border bg-secondary text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {bean.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="bean">Bean</Label>
                <Select
                  value={formData.beanId || undefined}
                  onValueChange={handleBeanSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select beans" />
                  </SelectTrigger>
                  <SelectContent>
                    {beans.map((bean) => (
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recipe</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!formData.beanId || !formData.recipeId}
                onClick={async () => {
                  const prevShot = await getPreviousShotBySetup({
                    data: {
                      beanId: formData.beanId ? Number(formData.beanId) : undefined,
                      recipeId: formData.recipeId ? Number(formData.recipeId) : undefined,
                    },
                  })
                  if (prevShot) {
                    setFormData((prev) => ({
                      ...prev,
                      doseGrams: prevShot.doseGrams ?? "",
                      yieldGrams: prevShot.yieldGrams ?? "",
                      grindSetting: prevShot.grindSetting ?? "",
                      waterTempCelsius: prevShot.waterTempCelsius ?? "",
                      pressure: prevShot.pressure ?? "",
                    }))
                    if (prevShot.brewTimeSeconds) {
                      setTimerSeconds(prevShot.brewTimeSeconds)
                    }
                  }
                }}
              >
                <History className="h-4 w-4" />
                Load from previous
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipe">Recipe</Label>
                <Select
                  value={formData.recipeId || undefined}
                  onValueChange={(v) =>
                    setFormData({ ...formData, recipeId: v ?? "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={String(recipe.id)}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedRecipe && selectedRecipe.gear.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Gear for this recipe
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipe.gear.map((rg) => (
                      <span
                        key={rg.id}
                        className="rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-coffee"
                      >
                        {rg.gear.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Extraction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <InputField
                  id="dose"
                  label="Dose (g)"
                  placeholder="18.0"
                  value={formData.doseGrams}
                  onChange={(value) => setFormData({ ...formData, doseGrams: value })}
                />
                <InputField
                  id="yield"
                  label="Yield (g)"
                  placeholder="36.0"
                  value={formData.yieldGrams}
                  onChange={(value) => setFormData({ ...formData, yieldGrams: value })}
                />
                <InputField
                  id="grindSetting"
                  label="Grind setting"
                  placeholder="e.g., 15"
                  value={formData.grindSetting}
                  onChange={(value) => setFormData({ ...formData, grindSetting: value })}
                />
                <InputField
                  id="temp"
                  label="Water temp (°C)"
                  placeholder="93.0"
                  value={formData.waterTempCelsius}
                  onChange={(value) =>
                    setFormData({ ...formData, waterTempCelsius: value })
                  }
                />
                <InputField
                  id="pressure"
                  label="Pressure (bar)"
                  placeholder="9.0"
                  value={formData.pressure}
                  onChange={(value) => setFormData({ ...formData, pressure: value })}
                />
                <div className="space-y-2">
                  <Label>Brew time</Label>
                  <div className="flex h-10 items-center rounded-2xl border border-border bg-secondary px-3.5 font-display text-base font-bold text-primary">
                    {formatTime(timerSeconds)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasting notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Rating</Label>
                <StarRating
                  value={formData.rating}
                  onChange={(rating) => setFormData({ ...formData, rating })}
                />
              </div>

              {positiveTags.length > 0 && (
                <div className="space-y-2">
                  <Label>Positive</Label>
                  <div className="flex flex-wrap gap-2">
                    {positiveTags.map((tag) => {
                      const selected = selectedTags.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={cn(
                            "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                            selected
                              ? "bg-[#EAF0DC] text-[#6B8A3D]"
                              : "border border-dashed border-border bg-secondary text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {tag.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {negativeTags.length > 0 && (
                <div className="space-y-2">
                  <Label>Issues</Label>
                  <div className="flex flex-wrap gap-2">
                    {negativeTags.map((tag) => {
                      const selected = selectedTags.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={cn(
                            "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                            selected
                              ? "bg-[#F8E2DA] text-[#C0573A]"
                              : "border border-dashed border-border bg-secondary text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {tag.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <TextareaField
                id="notes"
                label="Notes"
                placeholder="How was it? Any observations?"
                value={formData.notes}
                onChange={(value) => setFormData({ ...formData, notes: value })}
              />
            </CardContent>
          </Card>

          <div className="flex gap-3 lg:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/shots" })}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Saving…" : "Save shot"}
            </Button>
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="flex flex-col items-center rounded-3xl bg-coffee p-6 text-coffee-foreground shadow-[0_10px_30px_-18px_rgba(60,42,30,0.55)]">
            <TimerRing
              seconds={timerSeconds}
              running={isTimerRunning}
            />
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={resetTimer}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-coffee-foreground transition-colors hover:bg-white/25"
                aria-label="Reset timer"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={isTimerRunning ? stopTimer : startTimer}
                className="flex h-12 items-center gap-2 rounded-full bg-primary px-7 font-display text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="h-4 w-4" fill="currentColor" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" fill="currentColor" />
                    Start
                  </>
                )}
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="space-y-0 divide-y divide-border">
              <div className="flex items-center justify-between pb-3">
                <span className="text-sm font-semibold text-muted-foreground">Ratio</span>
                <span className="font-display text-xl font-bold text-primary">
                  {ratio > 0 ? `1 : ${ratio.toFixed(1)}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-sm font-semibold text-muted-foreground">Flow</span>
                <span className="font-display text-xl font-bold text-foreground">
                  {flow > 0 ? `${flow.toFixed(1)} g/s` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" disabled={isSubmitting} className="hidden w-full lg:flex">
            {isSubmitting ? "Saving…" : "Save shot"}
          </Button>
        </aside>
      </form>
    </div>
  )
}

function TimerRing({ seconds, running }: { seconds: number; running: boolean }) {
  const progress = Math.min(seconds / SHOT_TARGET_SECONDS, 1)
  const arcDeg = Math.round(progress * 360)
  return (
    <div
      className="flex h-48 w-48 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(var(--primary) ${arcDeg}deg, rgba(255,255,255,0.13) 0)`,
      }}
    >
      <div className="flex h-[170px] w-[170px] flex-col items-center justify-center rounded-full bg-coffee ring-1 ring-white/15">
        <div className="flex items-baseline gap-1 font-display font-extrabold text-coffee-foreground">
          <span className="text-5xl leading-none">{seconds}</span>
          <span className="text-xl text-coffee-foreground/70">s</span>
        </div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-coffee-foreground/70">
          {running ? "Extracting" : seconds > 0 ? "Paused" : "Ready"}
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}
