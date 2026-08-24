import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, BookOpen, History } from 'lucide-react'
import { type SyntheticEvent, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BeanCard } from '@/components/beans/bean-card'
import { BeanPicker } from '@/components/beans/bean-picker'
import { CreatableCombobox } from '@/components/form/creatable-combobox'
import { DateTimeField } from '@/components/form/date-field'
import {
  InputField,
  SelectField,
  TextareaField,
} from '@/components/form/form-field'
import { FormErrorSummary, FormSection } from '@/components/form/form-shell'
import { Page, PageHeader } from '@/components/page-layout'
import { AiRecommendationDialog } from '@/components/shots/ai-recommendation-dialog'
import { ExtractionBalanceField } from '@/components/shots/extraction-balance-field'
import {
  availableGearForShot,
  EMPTY_SHOT_FORM_VALUES,
  type ShotFormValues,
  ShotParameterFields,
  shotFormValuesFrom,
  shotFormValuesWithRecipe,
} from '@/components/shots/shot-parameter-fields'
import { ShotSensoryRatingFields } from '@/components/shots/shot-sensory-ratings'
import { ShotTimer, type ShotTimerHandle } from '@/components/shots/shot-timer'
import { TasteTagSelector } from '@/components/shots/taste-tag-selector'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { StarRating } from '@/components/ui/star-rating'
import {
  useCurrentLocalDateTimeLimit,
  useLocalDateTimeInput,
} from '@/hooks/use-local-date-time-input'
import { useTasteProfile } from '@/hooks/use-taste-profile'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { focusFirstInvalidControl } from '@/lib/form-validation'
import { getLastBeanIdForBrewingMethod } from '@/lib/new-shot-defaults'
import { newShotPayload } from '@/lib/new-shot-payload'
import { getActiveBeans } from '@/lib/server/beans'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getGear } from '@/lib/server/gear'
import { getRecipes } from '@/lib/server/recipes'
import { checkShotRecommendationEnabled } from '@/lib/server/shot-recommendations'
import {
  createShot,
  createShotWithRecipe,
  getLastShotForBeanAndMethod,
} from '@/lib/server/shots'
import {
  getBeanSuggestions,
  getBrewingMethodSuggestions,
  getLastBeansByBrewingMethod,
} from '@/lib/server/suggestions'
import { getTasteTags } from '@/lib/server/taste-tags'
import {
  enabledSensoryRatingKeys,
  hasEnabledTasteProfileField,
} from '@/lib/taste-profile'
import { isLegacySensoryTasteTag } from '@/lib/taste-tags'
import { getShotUpdateErrors } from '@/lib/update-validation'

export const Route = createFileRoute('/brews/new')({
  loader: async () => {
    const [
      beans,
      methods,
      recipes,
      tasteTags,
      beanSuggestions,
      brewingMethodSuggestions,
      lastBeansByBrewingMethod,
      gear,
      recommendation,
    ] = await Promise.all([
      getActiveBeans(),
      getBrewingMethods(),
      getRecipes(),
      getTasteTags(),
      getBeanSuggestions(),
      getBrewingMethodSuggestions(),
      getLastBeansByBrewingMethod(),
      getGear(),
      checkShotRecommendationEnabled(),
    ])
    return {
      beans,
      methods,
      recipes,
      tasteTags,
      beanSuggestions,
      brewingMethodSuggestions,
      lastBeansByBrewingMethod,
      gear,
      recommendationEnabled: recommendation.enabled,
      defaultBrewedAt: new Date().toISOString(),
    }
  },
  component: NewShotPage,
})

function currentTastingValues(current: ShotFormValues) {
  return {
    rating: current.rating,
    extractionBalance: current.extractionBalance,
    bitterness: current.bitterness,
    acidity: current.acidity,
    sweetness: current.sweetness,
    body: current.body,
    astringency: current.astringency,
    notes: current.notes,
  }
}

function NewShotPage() {
  const {
    beans,
    methods,
    recipes,
    tasteTags,
    beanSuggestions,
    brewingMethodSuggestions,
    lastBeansByBrewingMethod,
    gear,
    recommendationEnabled,
    defaultBrewedAt,
  } = Route.useLoaderData()
  const navigate = useNavigate()
  const tasteProfile = useTasteProfile()
  const [values, setValues] = useState<ShotFormValues>(() => {
    const brewingMethodId = brewingMethodSuggestions[0]
      ? String(brewingMethodSuggestions[0].id)
      : ''
    return {
      ...EMPTY_SHOT_FORM_VALUES,
      brewingMethodId,
      beanId: getLastBeanIdForBrewingMethod(
        lastBeansByBrewingMethod,
        brewingMethodId,
      ),
    }
  })
  const [recipeId, setRecipeId] = useState('')
  const [brewedAt, setBrewedAt] = useLocalDateTimeInput(defaultBrewedAt)
  const latestBrewedAt = useCurrentLocalDateTimeLimit()
  const [recipeTarget, setRecipeTarget] = useState('new')
  const [recipeName, setRecipeName] = useState('')
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingLastShot, setIsLoadingLastShot] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<
    Readonly<Record<string, string>>
  >({})
  const [isDirty, setIsDirty] = useState(false)
  const [timerKey, setTimerKey] = useState(0)
  const isInitializing = useRef(true)
  const timerRef = useRef<ShotTimerHandle>(null)

  useEffect(() => {
    isInitializing.current = false
  }, [])

  useUnsavedChanges(isDirty && !isSubmitting)

  const selectedMethod = methods.find(
    (method) => String(method.id) === values.brewingMethodId,
  )
  const selectedRecipe = recipes.find(
    (recipe) => String(recipe.id) === recipeId,
  )
  const hasShotTimer =
    selectedMethod?.timerEnabled === true &&
    selectedMethod.enabledParameters.includes('shotTimeSeconds')

  const set = <Key extends keyof ShotFormValues>(
    key: Key,
    value: ShotFormValues[Key],
  ) => {
    if (!isInitializing.current) setIsDirty(true)
    setFieldErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
    setValues((current) => ({ ...current, [key]: value }))
  }

  const toggleTag = (tagId: number) => {
    setIsDirty(true)
    setSelectedTags((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    )
  }

  const selectMethod = (brewingMethodId: string) => {
    if (brewingMethodId === values.brewingMethodId) return
    setIsDirty(true)
    setTimerKey((current) => current + 1)
    setRecipeId('')
    setRecipeTarget('new')
    setRecipeName('')
    setValues((current) => ({
      ...current,
      brewingMethodId,
      beanId: getLastBeanIdForBrewingMethod(
        lastBeansByBrewingMethod,
        brewingMethodId,
      ),
      shotTimeSeconds: '',
    }))
  }

  const loadRecipe = (id: string) => {
    setRecipeId(id)
    setRecipeTarget(id ? `update:${id}` : 'new')
    setRecipeName('')
    const recipe = recipes.find((item) => String(item.id) === id)
    if (!recipe) return
    setIsDirty(true)
    setTimerKey((current) => current + 1)
    setValues((current) => shotFormValuesWithRecipe(current, recipe))
    toast.success(`Loaded ${recipe.name}`)
  }

  const loadLastShot = async () => {
    if (!values.beanId) return
    setIsLoadingLastShot(true)
    try {
      const shot = await getLastShotForBeanAndMethod({
        data: {
          beanId: Number(values.beanId),
          brewingMethodId: Number(values.brewingMethodId),
        },
      })
      if (!shot) {
        toast.info('No previous brew found for these beans and method')
        return
      }
      setValues((current) => ({
        ...shotFormValuesFrom(shot),
        beanId: current.beanId,
        ...currentTastingValues(current),
      }))
      setRecipeId('')
      setRecipeTarget('new')
      setRecipeName('')
      setIsDirty(true)
      setTimerKey((current) => current + 1)
      toast.success('Loaded the last brew for these beans and method')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not load the last brew',
      )
    } finally {
      setIsLoadingLastShot(false)
    }
  }

  const saveShot = async (
    targetRecipe: string | null,
    formElement?: HTMLFormElement,
  ) => {
    const timerValue = hasShotTimer ? timerRef.current?.getValue() : undefined
    const submittedValues =
      timerValue === undefined
        ? values
        : { ...values, shotTimeSeconds: timerValue }
    const data = newShotPayload(submittedValues, selectedTags, {
      brewedAt,
      recipeId,
    })
    const errors = getShotUpdateErrors({ id: 1, ...data })
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      if (formElement) focusFirstInvalidControl(formElement)
      return
    }

    setIsSubmitting(true)
    try {
      if (targetRecipe) {
        await createShotWithRecipe({
          data: {
            shot: data,
            target:
              targetRecipe === 'new'
                ? { name: recipeName.trim() }
                : {
                    recipeId: Number(targetRecipe.slice('update:'.length)),
                  },
          },
        })
      } else {
        await createShot({ data })
      }
      setIsDirty(false)
      await navigate({ to: '/brews' })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save this brew',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    await saveShot(null, event.currentTarget)
  }

  const handleRecipeSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (recipeTarget === 'new' && !recipeName.trim()) return
    await saveShot(recipeTarget)
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
  const availableRecipes = recipes.filter(
    (recipe) => String(recipe.brewingMethodId) === values.brewingMethodId,
  )
  const flavorTags = tasteTags.filter(
    (tag) => !isLegacySensoryTasteTag(tag) || selectedTags.includes(tag.id),
  )
  const showSensoryRatings = enabledSensoryRatingKeys(tasteProfile).length > 0
  const showExtractionBalance = tasteProfile.extractionBalance

  return (
    <Page>
      <PageHeader
        title="New brew"
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/brews" aria-label="Back to brews">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start"
      >
        <div className="space-y-5">
          <FormErrorSummary errors={fieldErrors} />
          <FormSection
            title="Brewing method"
            description="The method controls which brewing parameters this brew uses."
            contentClassName="grid gap-4 space-y-0 sm:grid-cols-2"
          >
            <CreatableCombobox
              id="brewing-method"
              label="Method"
              placeholder="Choose a brewing method"
              value={values.brewingMethodId}
              items={methods}
              suggestions={brewingMethodSuggestions}
              getKey={({ id }) => id}
              getLabel={({ name }) => name}
              onChange={selectMethod}
              searchPlaceholder="Search brewing methods…"
              emptyMessage="No brewing methods found."
              required
              error={fieldErrors.brewingMethodId}
            />
            {selectedMethod ? (
              <CreatableCombobox
                id="shot-recipe"
                label="Load from recipe"
                value={recipeId}
                items={availableRecipes}
                suggestions={availableRecipes.slice(0, 5)}
                getKey={({ id }) => id}
                getLabel={({ name }) => name}
                onChange={loadRecipe}
                placeholder="Choose a recipe"
                searchPlaceholder="Search recipes…"
                emptyMessage="No recipes saved for this method."
              />
            ) : null}
            <DateTimeField
              id="brewed-at"
              label="Brewed at"
              value={brewedAt}
              onChange={(value) => {
                setBrewedAt(value)
                setIsDirty(true)
                setFieldErrors((current) => {
                  if (!current.brewedAt) return current
                  const next = { ...current }
                  delete next.brewedAt
                  return next
                })
              }}
              max={latestBrewedAt}
              error={fieldErrors.brewedAt}
              required
            />
          </FormSection>
          <FormSection title="Beans">
            <BeanPicker
              id="bean"
              label="Bean"
              value={values.beanId}
              onChange={(beanId) => set('beanId', beanId ?? '')}
              beans={beanOptions}
              suggestions={beanSuggestions}
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
                {isLoadingLastShot ? 'Loading…' : 'Load last brew'}
              </Button>
            ) : null}
          </FormSection>
          <ShotParameterFields
            values={values}
            gear={gearOptions}
            enabledParameters={selectedMethod?.enabledParameters ?? []}
            useEquipmentSetupDefaults
            errors={fieldErrors}
            onChange={set}
          />
          {hasEnabledTasteProfileField(tasteProfile) ? (
            <FormSection title="Taste profile">
              {tasteProfile.overallRating ||
              showSensoryRatings ||
              showExtractionBalance ? (
                <div className="space-y-1">
                  {tasteProfile.overallRating ? (
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <span className="text-sm font-medium">
                        Overall rating
                      </span>
                      <StarRating
                        value={values.rating}
                        onChange={(rating) => set('rating', rating)}
                        sizeClassName="size-5"
                        ariaLabel="Shot rating"
                      />
                    </div>
                  ) : null}
                  <ShotSensoryRatingFields
                    values={values}
                    onChange={(key, value) => set(key, value)}
                  />
                  {showExtractionBalance ? (
                    <div className="pt-1">
                      <ExtractionBalanceField
                        value={values.extractionBalance}
                        onChange={(value) => set('extractionBalance', value)}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {tasteProfile.flavorTags ? (
                <TasteTagSelector
                  label="Flavor tags"
                  tags={flavorTags}
                  selected={selectedTags}
                  onToggle={toggleTag}
                />
              ) : null}
              {tasteProfile.notes ? (
                <TextareaField
                  id="notes"
                  label="Tasting notes"
                  value={values.notes}
                  onChange={(value) => set('notes', value)}
                  placeholder="How was it?"
                />
              ) : null}
            </FormSection>
          ) : null}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24">
          {selectedBean ? (
            <div className="hidden lg:block">
              <BeanCard bean={selectedBean} />
            </div>
          ) : null}
          <AiRecommendationDialog
            enabled={recommendationEnabled}
            request={
              values.beanId && values.brewingMethodId
                ? {
                    beanId: Number(values.beanId),
                    brewingMethodId: Number(values.brewingMethodId),
                  }
                : null
            }
            size="lg"
            className="w-full"
          />
          {hasShotTimer ? (
            <ShotTimer
              key={timerKey}
              ref={timerRef}
              value={values.shotTimeSeconds}
              onCommit={(value) => set('shotTimeSeconds', value)}
            />
          ) : null}
          <Dialog
            open={isRecipeDialogOpen}
            onOpenChange={setIsRecipeDialogOpen}
          >
            <DialogTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  disabled={!values.brewingMethodId || isSubmitting}
                />
              }
            >
              <BookOpen />
              Save into recipe
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save brew into a recipe</DialogTitle>
                <DialogDescription>
                  Save the brew and store its final bean, equipment, and brewing
                  values in a new or existing recipe.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleRecipeSubmit}
                className="grid min-h-0 grid-rows-[1fr_auto]"
              >
                <DialogBody>
                  <SelectField
                    id="shot-recipe-target"
                    label="Save values to"
                    value={recipeTarget}
                    onChange={setRecipeTarget}
                    options={[
                      { value: 'new', label: 'A new recipe' },
                      ...availableRecipes.map((recipe) => ({
                        value: `update:${recipe.id}`,
                        label:
                          recipe.id === selectedRecipe?.id
                            ? `${recipe.name} (loaded)`
                            : recipe.name,
                      })),
                    ]}
                  />
                  {recipeTarget === 'new' ? (
                    <InputField
                      id="new-shot-recipe-name"
                      label="New recipe name"
                      value={recipeName}
                      onChange={setRecipeName}
                      required
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      The selected recipe’s current values will be replaced. Its
                      name will stay the same.
                    </p>
                  )}
                </DialogBody>
                <DialogFooter>
                  <DialogClose
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                      />
                    }
                  >
                    Cancel
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={
                      (recipeTarget === 'new' && !recipeName.trim()) ||
                      isSubmitting
                    }
                    aria-busy={isSubmitting}
                  >
                    {isSubmitting ? 'Saving…' : 'Save brew and recipe'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button
            type="submit"
            size="lg"
            disabled={!values.brewingMethodId || isSubmitting}
            aria-busy={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Saving…' : 'Save brew'}
          </Button>
        </aside>
      </form>
    </Page>
  )
}
