import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState, type SyntheticEvent } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { StarRating } from "@/components/ui/star-rating"
import { InputField, TextareaField } from "@/components/form/form-field"
import { FormSection } from "@/components/form/form-shell"
import { SuggestionChips } from "@/components/form/suggestion-chips"
import { BeanCard } from "@/components/beans/bean-card"
import { BeanPicker } from "@/components/beans/bean-picker"
import { RecipePicker } from "@/components/recipes/recipe-picker"
import { CreatableCombobox } from "@/components/form/creatable-combobox"
import { getActiveBeans } from "@/lib/server/beans"
import { getRecipes } from "@/lib/server/recipes"
import { getTasteTags } from "@/lib/server/taste-tags"
import { getActiveGearByType } from "@/lib/server/gear"
import {
  createShot,
  getPreviousShotBySetup,
  getPrefillRecipe,
} from "@/lib/server/shots"
import {
  getBeanSuggestions,
  getRecipeSuggestions,
} from "@/lib/server/suggestions"
import { cn } from "@/lib/utils"
import { ArrowLeft, Play, Pause, RotateCcw, History } from "lucide-react"

const SHOT_TARGET_SECONDS = 30

type TasteTag = Awaited<ReturnType<typeof getTasteTags>>[number]

function NewShotTasteTagGroup({
  label,
  tags,
  selectedTags,
  selectedClassName,
  onToggle,
}: {
  readonly label: string
  readonly tags: readonly TasteTag[]
  readonly selectedTags: readonly number[]
  readonly selectedClassName: string
  readonly onToggle: (tagId: number) => void
}) {
  if (tags.length === 0) return null

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const selected = selectedTags.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                selected
                  ? selectedClassName
                  : "border border-dashed border-border bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {tag.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const Route = createFileRoute("/shots/new")({
  loader: async () => {
    const [beans, recipes, tasteTags, beanSuggestions, recipeSuggestions, machines] =
      await Promise.all([
        getActiveBeans(),
        getRecipes(),
        getTasteTags(),
        getBeanSuggestions(),
        getRecipeSuggestions(),
        getActiveGearByType({ data: "espresso_machine" }),
      ])

    return { beans, recipes, tasteTags, beanSuggestions, recipeSuggestions, machines }
  },
  component: NewShotPage,
})

function NewShotPage() {
  const { beans, recipes, tasteTags, beanSuggestions, recipeSuggestions, machines } =
    Route.useLoaderData()
  const navigate = useNavigate()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  const [timerMilliseconds, setTimerMilliseconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const timerStartedAt = useRef(0)
  const beanSelectionVersion = useRef(0)

  const [formData, setFormData] = useState({
    beanId: "",
    recipeId: "",
    machineId: "",
    actualDoseGrams: "",
    actualYieldGrams: "",
    grindSetting: "",
    actualTemperatureCelsius: "",
    actualPressureBar: "",
    rating: 3,
    notes: "",
  })

  useEffect(() => {
    if (!isTimerRunning) return

    const updateElapsedTime = () => {
      setTimerMilliseconds(performance.now() - timerStartedAt.current)
    }
    const interval = window.setInterval(updateElapsedTime, 100)
    updateElapsedTime()

    return () => window.clearInterval(interval)
  }, [isTimerRunning])

  const startTimer = () => {
    if (isTimerRunning) return
    timerStartedAt.current = performance.now() - timerMilliseconds
    setIsTimerRunning(true)
  }

  const stopTimer = () => {
    if (!isTimerRunning) return
    setTimerMilliseconds(performance.now() - timerStartedAt.current)
    setIsTimerRunning(false)
  }

  const resetTimer = () => {
    setIsTimerRunning(false)
    setTimerMilliseconds(0)
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
    const selectionVersion = ++beanSelectionVersion.current
    setFormData((prev) => ({ ...prev, beanId: id, recipeId: "" }))
    if (id) {
      const recipeId = await getPrefillRecipe({ data: Number(id) })
      if (recipeId && selectionVersion === beanSelectionVersion.current) {
        setFormData((prev) =>
          prev.beanId === id ? { ...prev, recipeId: String(recipeId) } : prev
        )
      }
    }
  }

  const handleRecipeSelect = (recipeId: string) => {
    beanSelectionVersion.current += 1
    const recipe = recipes.find((item) => String(item.id) === recipeId)
    const enabled = new Set(recipe?.enabledFields.map(({ fieldKey }) => fieldKey) ?? [])
    setFormData((prev) => ({
      ...prev,
      recipeId,
      actualDoseGrams: enabled.has("target_dose") ? recipe?.targetDoseGrams ?? "" : "",
      actualYieldGrams: enabled.has("target_yield") ? recipe?.targetYieldGrams ?? "" : "",
      actualTemperatureCelsius: enabled.has("brew_temperature") ? recipe?.brewTemperatureCelsius ?? "" : "",
      actualPressureBar: enabled.has("target_pressure") ? recipe?.targetBrewPressureBar ?? "" : "",
    }))
    if (enabled.has("target_time") && recipe?.targetTimeMinSeconds) {
      setTimerMilliseconds(Number(recipe.targetTimeMinSeconds) * 1000)
    } else if (recipeId) {
      setTimerMilliseconds(0)
    }
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await createShot({
        data: {
          beanId: formData.beanId ? Number(formData.beanId) : undefined,
          recipeId: formData.recipeId ? Number(formData.recipeId) : undefined,
          machineId: formData.machineId ? Number(formData.machineId) : undefined,
          actualDoseGrams: formData.actualDoseGrams || undefined,
          actualYieldGrams: formData.actualYieldGrams || undefined,
          actualShotTimeSeconds:
            timerMilliseconds > 0
              ? (timerMilliseconds / 1000).toFixed(2)
              : undefined,
          grindSetting: formData.grindSetting || undefined,
          actualTemperatureCelsius: formData.actualTemperatureCelsius || undefined,
          actualPressureBar: formData.actualPressureBar || undefined,
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

  const selectedBean = beans.find((bean) => String(bean.id) === formData.beanId)
  const selectedRecipe = recipes.find(
    (recipe) => String(recipe.id) === formData.recipeId
  )
  const enabledShotFields = new Set(
    selectedRecipe?.enabledFields.map(({ fieldKey }) => fieldKey) ?? [],
  )
  const showShotField = (fieldKey: string) =>
    !selectedRecipe || enabledShotFields.has(fieldKey)

  const dose = parseFloat(formData.actualDoseGrams) || 0
  const yieldG = parseFloat(formData.actualYieldGrams) || 0
  const ratio = dose > 0 ? yieldG / dose : 0
  const timerSeconds = timerMilliseconds / 1000
  const flow = timerSeconds > 0 && yieldG > 0 ? yieldG / timerSeconds : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link to="/shots">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          New shot
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start"
      >
        <div className="space-y-5">
          <FormSection title="Beans">
              <SuggestionChips
                label="Bean"
                items={beanSuggestions}
                value={formData.beanId}
                onChange={handleBeanSelect}
              />
              <BeanPicker
                id="bean"
                label="Bean"
                value={formData.beanId}
                onChange={handleBeanSelect}
                beans={beans}
              />
              {selectedBean && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <BeanCard bean={selectedBean} />
                </div>
              )}
          </FormSection>

          <FormSection
            title="Recipe"
            action={
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
                      actualDoseGrams: prevShot.actualDoseGrams ?? "",
                      actualYieldGrams: prevShot.actualYieldGrams ?? "",
                      grindSetting: prevShot.grindSetting ?? "",
                      actualTemperatureCelsius: prevShot.actualTemperatureCelsius ?? "",
                      actualPressureBar: prevShot.actualPressureBar ?? "",
                    }))
                    if (prevShot.actualShotTimeSeconds) {
                      setTimerMilliseconds(Number(prevShot.actualShotTimeSeconds) * 1000)
                    }
                  }
                }}
              >
                <History className="h-4 w-4" />
                Load from previous
              </Button>
            }
          >
              <SuggestionChips
                label="Recipe"
                items={recipeSuggestions}
                value={formData.recipeId}
                onChange={handleRecipeSelect}
              />
              <RecipePicker
                id="recipe"
                label="Recipe"
                value={formData.recipeId}
                onChange={handleRecipeSelect}
                recipes={recipes}
              />
              <CreatableCombobox
                id="shot-machine"
                label="Espresso machine"
                value={formData.machineId}
                onChange={(value) => setFormData((current) => ({ ...current, machineId: value }))}
                items={machines}
                getKey={({ id }) => id}
                getLabel={({ name }) => name}
                placeholder="Select machine"
                searchPlaceholder="Search machines…"
                emptyMessage="No espresso machines found."
              />
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
          </FormSection>

          <FormSection title="Extraction">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {showShotField("target_dose") ? <InputField
                  id="dose"
                  label="Dose (g)"
                  placeholder="18.0"
                  value={formData.actualDoseGrams}
                  onChange={(value) => setFormData({ ...formData, actualDoseGrams: value })}
                /> : null}
                {showShotField("target_yield") ? <InputField
                  id="yield"
                  label="Yield (g)"
                  placeholder="36.0"
                  value={formData.actualYieldGrams}
                  onChange={(value) => setFormData({ ...formData, actualYieldGrams: value })}
                /> : null}
                {!selectedRecipe ? <InputField
                  id="grindSetting"
                  label="Grind setting"
                  placeholder="e.g., 15"
                  value={formData.grindSetting}
                  onChange={(value) => setFormData({ ...formData, grindSetting: value })}
                /> : null}
                {showShotField("brew_temperature") ? <InputField
                  id="temp"
                  label="Water temp (°C)"
                  placeholder="93.0"
                  value={formData.actualTemperatureCelsius}
                  onChange={(value) =>
                    setFormData({ ...formData, actualTemperatureCelsius: value })
                  }
                /> : null}
                {showShotField("target_pressure") ? <InputField
                  id="pressure"
                  label="Pressure (bar)"
                  placeholder="9.0"
                  value={formData.actualPressureBar}
                  onChange={(value) => setFormData({ ...formData, actualPressureBar: value })}
                /> : null}
                {showShotField("target_time") ? <InputField
                  id="brewTime"
                  label="Brew time (seconds)"
                  inputMode="numeric"
                  placeholder="30"
                  value={
                    timerMilliseconds > 0
                      ? String(Math.round(timerMilliseconds / 1000))
                      : ""
                  }
                  onChange={(value) =>
                    setTimerMilliseconds(Number(value.replace(/[^0-9]/g, "")) * 1000)
                  }
                  disabled={isTimerRunning}
                /> : null}
              </div>
          </FormSection>

          <FormSection title="Tasting notes">
              <div className="space-y-2">
                <Label>Rating</Label>
                <StarRating
                  value={formData.rating}
                  onChange={(rating) => setFormData({ ...formData, rating })}
                />
              </div>

              <NewShotTasteTagGroup
                label="Positive"
                tags={positiveTags}
                selectedTags={selectedTags}
                selectedClassName="bg-positive/15 text-positive"
                onToggle={toggleTag}
              />

              <NewShotTasteTagGroup
                label="Issues"
                tags={negativeTags}
                selectedTags={selectedTags}
                selectedClassName="bg-destructive/10 text-destructive"
                onToggle={toggleTag}
              />

              <TextareaField
                id="notes"
                label="Notes"
                placeholder="How was it? Any observations?"
                value={formData.notes}
                onChange={(value) => setFormData({ ...formData, notes: value })}
              />
          </FormSection>

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
          <div className="flex flex-col items-center rounded-3xl bg-coffee p-6 text-coffee-foreground shadow-coffee-strong">
            <TimerRing
              milliseconds={timerMilliseconds}
              running={isTimerRunning}
            />
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={resetTimer}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-coffee-foreground/15 text-coffee-foreground transition-colors hover:bg-coffee-foreground/25"
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

function TimerRing({
  milliseconds,
  running,
}: {
  readonly milliseconds: number
  readonly running: boolean
}) {
  const seconds = milliseconds / 1000
  const displaySeconds = getElapsedTenths(milliseconds) / 10
  const progress = Math.min(seconds / SHOT_TARGET_SECONDS, 1)
  const isOverTarget = seconds >= SHOT_TARGET_SECONDS
  const overtimeSeconds = Math.max(seconds - SHOT_TARGET_SECONDS, 0)
  const overtimeProgress =
    (overtimeSeconds % SHOT_TARGET_SECONDS) / SHOT_TARGET_SECONDS
  const overtimeLap = Math.floor(overtimeSeconds / SHOT_TARGET_SECONDS)
  const radius = 88
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference * (1 - progress)
  const overtimeStrokeOffset = circumference * (1 - overtimeProgress)
  const timerStatus = running
    ? isOverTarget
      ? "over target"
      : "extracting"
    : seconds > 0
      ? "paused"
      : "ready"

  return (
    <div
      className="relative flex h-48 w-48 items-center justify-center rounded-full"
      role="timer"
      aria-label={`${displaySeconds.toFixed(1)} seconds, ${timerStatus}`}
    >
      <svg
        className="absolute inset-0 -rotate-90"
        viewBox="0 0 192 192"
        aria-hidden="true"
      >
        <circle
          cx="96"
          cy="96"
          r={radius}
          fill="none"
          stroke="color-mix(in srgb, var(--coffee-foreground) 13%, transparent)"
          strokeWidth="10"
        />
        <circle
          cx="96"
          cy="96"
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          className="transition-[stroke-dashoffset] duration-100 ease-linear motion-reduce:transition-none"
        />
        {isOverTarget && (
          <circle
            key={overtimeLap}
            cx="96"
            cy="96"
            r={radius}
            fill="none"
            stroke="var(--coffee-foreground)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={overtimeStrokeOffset}
            className="transition-[stroke-dashoffset] duration-100 ease-linear motion-reduce:transition-none"
          />
        )}
      </svg>
      <div className="flex h-[170px] w-[170px] flex-col items-center justify-center rounded-full bg-coffee ring-1 ring-coffee-foreground/15">
        <div className="flex items-baseline gap-1 font-display font-extrabold tabular-nums text-coffee-foreground">
          <span className="text-5xl leading-none">{displaySeconds.toFixed(1)}</span>
          <span className="text-xl text-coffee-foreground/70">s</span>
        </div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-coffee-foreground">
          {running && isOverTarget
            ? "Over target"
            : running
              ? "Extracting"
              : seconds > 0
                ? "Paused"
                : "Ready"}
        </div>
      </div>
    </div>
  )
}

function getElapsedTenths(milliseconds: number) {
  return Math.floor(milliseconds / 100)
}
