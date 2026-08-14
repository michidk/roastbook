import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, History } from 'lucide-react'
import { type SyntheticEvent, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BeanCard } from '@/components/beans/bean-card'
import { BeanPicker } from '@/components/beans/bean-picker'
import { CreatableCombobox } from '@/components/form/creatable-combobox'
import { SelectField, TextareaField } from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import { SuggestionChips } from '@/components/form/suggestion-chips'
import {
  availableGearForShot,
  EMPTY_SHOT_FORM_VALUES,
  type ShotFormValues,
  ShotParameterFields,
  shotFormValuesFrom,
} from '@/components/shots/shot-parameter-fields'
import { ShotTimer } from '@/components/shots/shot-timer'
import { TasteTagSelector } from '@/components/shots/taste-tag-selector'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { StarRating } from '@/components/ui/star-rating'
import { newShotPayload } from '@/lib/new-shot-payload'
import { getActiveBeans } from '@/lib/server/beans'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getGear } from '@/lib/server/gear'
import { getRecipes } from '@/lib/server/recipes'
import { createShot, getLastShotForBean } from '@/lib/server/shots'
import { getBeanSuggestions } from '@/lib/server/suggestions'
import { getTasteTags } from '@/lib/server/taste-tags'

export const Route = createFileRoute('/shots/new')({
  loader: async () => {
    const [beans, methods, recipes, tasteTags, beanSuggestions, gear] =
      await Promise.all([
        getActiveBeans(),
        getBrewingMethods(),
        getRecipes(),
        getTasteTags(),
        getBeanSuggestions(),
        getGear(),
      ])
    return { beans, methods, recipes, tasteTags, beanSuggestions, gear }
  },
  component: NewShotPage,
})

function NewShotPage() {
  const { beans, methods, recipes, tasteTags, beanSuggestions, gear } =
    Route.useLoaderData()
  const navigate = useNavigate()
  const [values, setValues] = useState<ShotFormValues>(() => ({
    ...EMPTY_SHOT_FORM_VALUES,
  }))
  const [recipeId, setRecipeId] = useState('')
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingLastShot, setIsLoadingLastShot] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerAnnouncement, setTimerAnnouncement] = useState('Timer ready')
  const timerStartedAt = useRef(0)

  const selectedMethod = methods.find(
    (method) => String(method.id) === values.brewingMethodId,
  )
  const selectedRecipe = recipes.find(
    (recipe) => String(recipe.id) === recipeId,
  )
  const hasShotTimer =
    selectedMethod?.timerEnabled === true &&
    selectedMethod.enabledParameters.includes('shotTimeSeconds')

  useEffect(() => {
    if (!timerRunning || !hasShotTimer) return
    const update = () =>
      setValues((current) => ({
        ...current,
        shotTimeSeconds: (
          (performance.now() - timerStartedAt.current) /
          1000
        ).toFixed(1),
      }))
    const interval = window.setInterval(update, 100)
    update()
    return () => window.clearInterval(interval)
  }, [hasShotTimer, timerRunning])

  const set = <Key extends keyof ShotFormValues>(
    key: Key,
    value: ShotFormValues[Key],
  ) => setValues((current) => ({ ...current, [key]: value }))

  const selectMethod = (brewingMethodId: string) => {
    setTimerRunning(false)
    setTimerAnnouncement('Timer ready')
    setRecipeId('')
    setValues((current) => ({
      ...current,
      brewingMethodId,
      shotTimeSeconds: '',
    }))
  }

  const loadRecipe = (id: string) => {
    setRecipeId(id)
    const recipe = recipes.find((item) => String(item.id) === id)
    if (!recipe) return
    setTimerRunning(false)
    setValues((current) => ({
      ...shotFormValuesFrom(recipe),
      rating: current.rating,
      notes: current.notes,
    }))
    toast.success(`Loaded ${recipe.name}`)
  }

  const loadLastShot = async () => {
    if (!values.beanId) return
    setIsLoadingLastShot(true)
    try {
      const shot = await getLastShotForBean({ data: Number(values.beanId) })
      if (!shot) {
        toast.info('No previous shot found for these beans')
        return
      }
      setValues((current) => ({
        ...shotFormValuesFrom(shot),
        beanId: current.beanId,
        rating: current.rating,
        notes: current.notes,
      }))
      setRecipeId('')
      setTimerRunning(false)
      toast.success('Loaded the last shot for these beans')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load the last shot',
      )
    } finally {
      setIsLoadingLastShot(false)
    }
  }

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await createShot({ data: newShotPayload(values, selectedTags) })
      await navigate({ to: '/shots' })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save this shot',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const beanOptions =
    selectedRecipe?.bean &&
    !beans.some((bean) => bean.id === selectedRecipe.bean?.id)
      ? [selectedRecipe.bean, ...beans]
      : beans
  const selectedBean = beanOptions.find(
    (bean) => String(bean.id) === values.beanId,
  )
  const gearOptions = availableGearForShot(values, gear)
  const methodOptions = methods.map((method) => ({
    value: String(method.id),
    label: method.name,
  }))
  const availableRecipes = recipes.filter(
    (recipe) => String(recipe.brewingMethodId) === values.brewingMethodId,
  )
  const positiveTags = tasteTags.filter((tag) => tag.category === 'positive')
  const negativeTags = tasteTags.filter((tag) => tag.category === 'negative')

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/shots" aria-label="Back to shots">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          New shot
        </h1>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start"
      >
        <div className="space-y-5">
          <FormSection
            title="Brewing method"
            description="The method controls which brewing parameters this shot uses."
          >
            <SelectField
              id="brewing-method"
              label="Method"
              placeholder="Choose a brewing method"
              value={values.brewingMethodId}
              options={methodOptions}
              onChange={selectMethod}
              required
            />
            {selectedMethod ? (
              <CreatableCombobox
                id="shot-recipe"
                label="Load from recipe"
                value={recipeId}
                items={availableRecipes}
                getKey={({ id }) => id}
                getLabel={({ name }) => name}
                onChange={loadRecipe}
                placeholder="Choose a recipe"
                searchPlaceholder="Search recipes…"
                emptyMessage="No recipes saved for this method."
              />
            ) : null}
          </FormSection>
          <FormSection title="Beans">
            <SuggestionChips
              label="Bean"
              items={beanSuggestions}
              value={values.beanId}
              onChange={(beanId) => set('beanId', beanId ?? '')}
            />
            <BeanPicker
              id="bean"
              label="Bean"
              value={values.beanId}
              onChange={(beanId) => set('beanId', beanId ?? '')}
              beans={beanOptions}
            />
            {selectedBean ? (
              <Button
                type="button"
                variant="outline"
                disabled={isLoadingLastShot}
                aria-busy={isLoadingLastShot}
                onClick={loadLastShot}
              >
                <History />
                {isLoadingLastShot ? 'Loading…' : 'Load last shot from bean'}
              </Button>
            ) : null}
          </FormSection>
          <ShotParameterFields
            values={values}
            gear={gearOptions}
            enabledParameters={selectedMethod?.enabledParameters ?? []}
            useEquipmentSetupDefaults
            onChange={set}
          />
          <FormSection title="Tasting notes">
            <div className="space-y-2">
              <Label>Rating</Label>
              <StarRating
                value={values.rating}
                onChange={(rating) => set('rating', rating)}
              />
            </div>
            <TasteTagSelector
              label="Positive"
              tags={positiveTags}
              selected={selectedTags}
              onToggle={toggleTag}
            />
            <TasteTagSelector
              label="Issues"
              tags={negativeTags}
              selected={selectedTags}
              onToggle={toggleTag}
            />
            <TextareaField
              id="notes"
              label="Notes"
              value={values.notes}
              onChange={(value) => set('notes', value)}
              placeholder="How was it?"
            />
          </FormSection>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24">
          {selectedBean ? <BeanCard bean={selectedBean} /> : null}
          {hasShotTimer ? (
            <ShotTimer
              value={values.shotTimeSeconds}
              running={timerRunning}
              announcement={timerAnnouncement}
              onReset={() => {
                setTimerRunning(false)
                set('shotTimeSeconds', '')
                setTimerAnnouncement('Timer reset')
              }}
              onToggle={() => {
                if (timerRunning) {
                  setTimerRunning(false)
                  setTimerAnnouncement(
                    `Timer paused at ${values.shotTimeSeconds || '0.0'} seconds`,
                  )
                } else {
                  timerStartedAt.current =
                    performance.now() -
                    (Number(values.shotTimeSeconds) || 0) * 1000
                  setTimerRunning(true)
                  setTimerAnnouncement('Timer started')
                }
              }}
            />
          ) : null}
          <Button
            type="submit"
            size="lg"
            disabled={!values.brewingMethodId || isSubmitting}
            aria-busy={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Saving…' : 'Save shot'}
          </Button>
        </aside>
      </form>
    </div>
  )
}
