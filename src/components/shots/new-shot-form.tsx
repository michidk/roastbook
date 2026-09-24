import { History } from 'lucide-react'
import {
  type ReactElement,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import { BeanCard } from '@/components/beans/bean-card'
import { BeanPicker } from '@/components/beans/bean-picker'
import { DrinkSelectionFields } from '@/components/drinks/drink-selection-fields'
import { CreatableCombobox } from '@/components/form/creatable-combobox'
import { DateTimeField } from '@/components/form/date-field'
import { TextareaField } from '@/components/form/form-field'
import { FormErrorSummary, FormSection } from '@/components/form/form-shell'
import { GearSetPicker } from '@/components/gear-sets/gear-set-picker'
import { AiRecommendationDialog } from '@/components/shots/ai-recommendation-dialog'
import { ExtractionBalanceField } from '@/components/shots/extraction-balance-field'
import {
  SaveToRecipeDialog,
  type SaveToRecipeTarget,
} from '@/components/shots/save-to-recipe-dialog'
import { ShotParameterFields } from '@/components/shots/shot-parameter-fields'
import { ShotSensoryRatingFields } from '@/components/shots/shot-sensory-ratings'
import {
  ShotTimer,
  ShotTimerStickyBar,
  useShotTimer,
} from '@/components/shots/shot-timer'
import { TasteTagSelector } from '@/components/shots/taste-tag-selector'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/ui/star-rating'
import {
  useCurrentLocalDateTimeLimit,
  useLocalDateTimeInput,
} from '@/hooks/use-local-date-time-input'
import { useTasteProfile } from '@/hooks/use-taste-profile'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import {
  type DrinkConfiguration,
  drinkConfigurationForBrewingMethod,
  drinkSelectionForConfiguration,
} from '@/lib/drink-options'
import { focusFirstInvalidControl } from '@/lib/form-validation'
import {
  getLastBeanIdForBrewingMethod,
  getLastBeanPurchaseIdForBrewingMethod,
} from '@/lib/new-shot-defaults'
import {
  newShotPayload,
  newShotRecommendationRequest,
} from '@/lib/new-shot-payload'
import type { getActiveBeanPurchases } from '@/lib/server/beans'
import type { getBrewingMethods } from '@/lib/server/brewing-methods'
import type { getGear } from '@/lib/server/gear'
import type { getGearSets } from '@/lib/server/gear-sets'
import type { getRecipes } from '@/lib/server/recipes'
import {
  createShot,
  createShotAndSaveRecipe,
  getLastShotForBeanAndMethod,
} from '@/lib/server/shots'
import type {
  getBeanSuggestions,
  getBrewingMethodSuggestions,
  getDrinkTypeSuggestions,
  getLastBeansByBrewingMethod,
  getTasteTagSuggestions,
} from '@/lib/server/suggestions'
import type { getTasteTags } from '@/lib/server/taste-tags'
import {
  enabledSensoryRatingKeys,
  hasEnabledTasteProfileField,
} from '@/lib/taste-profile'
import {
  FREQUENT_TASTE_TAG_LIMIT,
  isLegacySensoryTasteTag,
} from '@/lib/taste-tags'
import { getShotUpdateErrors } from '@/lib/update-validation'
import {
  availableGearForShot,
  EMPTY_SHOT_FORM_VALUES,
  type ShotFormValues,
  shotFormValuesFrom,
  shotFormValuesWithGearSet,
  shotFormValuesWithRecipe,
} from '@/modules/brews/shot-form-values'

type NewShotFormData = {
  readonly beans: Awaited<ReturnType<typeof getActiveBeanPurchases>>
  readonly methods: Awaited<ReturnType<typeof getBrewingMethods>>
  readonly recipes: Awaited<ReturnType<typeof getRecipes>>
  readonly tasteTags: Awaited<ReturnType<typeof getTasteTags>>
  readonly drinks: DrinkConfiguration
  readonly beanSuggestions: Awaited<ReturnType<typeof getBeanSuggestions>>
  readonly brewingMethodSuggestions: Awaited<
    ReturnType<typeof getBrewingMethodSuggestions>
  >
  readonly drinkTypeSuggestions: Awaited<
    ReturnType<typeof getDrinkTypeSuggestions>
  >
  readonly lastBeansByBrewingMethod: Awaited<
    ReturnType<typeof getLastBeansByBrewingMethod>
  >
  readonly tasteTagSuggestions: Awaited<
    ReturnType<typeof getTasteTagSuggestions>
  >
  readonly gear: Awaited<ReturnType<typeof getGear>>
  readonly gearSets: Awaited<ReturnType<typeof getGearSets>>
  readonly recommendationEnabled: boolean
  readonly defaultBrewedAt: string
}

type NewShotFormProps = {
  readonly data: NewShotFormData
  /** Beans an entry point such as a bean page asked to preselect. */
  readonly initialBean?: {
    readonly beanId?: number
    readonly beanPurchaseId?: number
  }
  /** Called after the brew was created, before the form unmounts. */
  readonly onSaved: () => Promise<void>
}

function requestedBeanPurchase(
  beans: NewShotFormData['beans'],
  initialBean: NewShotFormProps['initialBean'],
) {
  if (!initialBean) return undefined
  return (
    beans.find((bean) => bean.purchaseId === initialBean.beanPurchaseId) ??
    beans.find((bean) => bean.id === initialBean.beanId)
  )
}

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

export function NewShotForm({ data, initialBean, onSaved }: NewShotFormProps) {
  const {
    beans,
    methods,
    recipes,
    tasteTags,
    drinks,
    beanSuggestions,
    brewingMethodSuggestions,
    drinkTypeSuggestions,
    lastBeansByBrewingMethod,
    tasteTagSuggestions,
    gear,
    gearSets,
    recommendationEnabled,
    defaultBrewedAt,
  } = data
  const tasteProfile = useTasteProfile()
  const [values, setValues] = useState<ShotFormValues>(() => {
    const brewingMethodId = brewingMethodSuggestions[0]
      ? String(brewingMethodSuggestions[0].id)
      : ''
    const requested = requestedBeanPurchase(beans, initialBean)
    return {
      ...EMPTY_SHOT_FORM_VALUES,
      brewingMethodId,
      beanId: requested
        ? String(requested.id)
        : getLastBeanIdForBrewingMethod(
            lastBeansByBrewingMethod,
            brewingMethodId,
          ),
      beanPurchaseId: requested
        ? String(requested.purchaseId)
        : getLastBeanPurchaseIdForBrewingMethod(
            lastBeansByBrewingMethod,
            brewingMethodId,
          ),
    }
  })
  const [loadedRecipeId, setLoadedRecipeId] = useState('')
  const [gearSetId, setGearSetId] = useState('')
  const [brewedAt, setBrewedAt] = useLocalDateTimeInput(defaultBrewedAt)
  const latestBrewedAt = useCurrentLocalDateTimeLimit()
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingLastShot, setIsLoadingLastShot] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<
    Readonly<Record<string, string>>
  >({})
  const [isDirty, setIsDirty] = useState(false)
  const [timerKey, setTimerKey] = useState(0)
  const [inlineTimerVisible, setInlineTimerVisible] = useState(true)
  const isInitializing = useRef(true)
  const inlineTimerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    isInitializing.current = false
  }, [])

  useUnsavedChanges(isDirty && !isSubmitting)

  const selectedMethod = methods.find(
    (method) => String(method.id) === values.brewingMethodId,
  )
  const availableDrinks = drinkConfigurationForBrewingMethod(
    drinks,
    selectedMethod,
  )
  const selectedRecipe = recipes.find(
    (recipe) => String(recipe.id) === loadedRecipeId,
  )
  const hasShotTimer =
    selectedMethod?.timerEnabled === true &&
    selectedMethod.enabledParameters.includes('shotTimeSeconds')
  const timer = useShotTimer({
    value: values.shotTimeSeconds,
    targetSeconds: Number(values.targetTimeSeconds) || null,
    onCommit: (value) => set('shotTimeSeconds', value),
    resetKey: timerKey,
  })

  // The pinned readout only matters while the inline card is scrolled away.
  useEffect(() => {
    const element = inlineTimerRef.current
    if (!element || !hasShotTimer) return
    const observer = new IntersectionObserver(
      ([entry]) => setInlineTimerVisible(entry?.isIntersecting ?? true),
      { threshold: 0.4 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasShotTimer])

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
    setLoadedRecipeId('')
    const method = methods.find((item) => String(item.id) === brewingMethodId)
    const methodDrinks = drinkConfigurationForBrewingMethod(drinks, method)
    setValues((current) => {
      const drinkSelection = drinkSelectionForConfiguration(
        methodDrinks,
        current,
      )
      return {
        ...current,
        ...drinkSelection,
        brewingMethodId,
        beanId: getLastBeanIdForBrewingMethod(
          lastBeansByBrewingMethod,
          brewingMethodId,
        ),
        beanPurchaseId: getLastBeanPurchaseIdForBrewingMethod(
          lastBeansByBrewingMethod,
          brewingMethodId,
        ),
        shotTimeSeconds: '',
        targetTimeSeconds: '',
      }
    })
  }

  const loadRecipe = (id: string) => {
    setLoadedRecipeId(id)
    const recipe = recipes.find((item) => String(item.id) === id)
    if (!recipe) return
    setIsDirty(true)
    setTimerKey((current) => current + 1)
    setValues((current) => {
      const loaded = shotFormValuesWithRecipe(current, recipe)
      const purchase = beans.find((bean) => String(bean.id) === loaded.beanId)
      return {
        ...loaded,
        beanPurchaseId: purchase ? String(purchase.purchaseId) : '',
      }
    })
    toast.success(`Loaded ${recipe.name}`)
  }

  const loadGearSet = (id: string) => {
    setGearSetId(id)
    const gearSet = gearSets.find((item) => String(item.id) === id)
    if (!gearSet) return
    setIsDirty(true)
    setValues((current) => shotFormValuesWithGearSet(current, gearSet))
    toast.success(`Loaded ${gearSet.name}`)
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
      setValues((current) => {
        const loaded = shotFormValuesFrom(shot)
        return {
          ...loaded,
          ...drinkSelectionForConfiguration(availableDrinks, loaded),
          beanId: current.beanId,
          ...currentTastingValues(current),
        }
      })
      setLoadedRecipeId('')
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
    targetRecipe: SaveToRecipeTarget | null,
    formElement?: HTMLFormElement,
  ) => {
    const timerValue = hasShotTimer ? timer.getValue() : undefined
    const submittedValues =
      timerValue === undefined
        ? values
        : { ...values, shotTimeSeconds: timerValue }
    const data = newShotPayload(submittedValues, selectedTags, { brewedAt })
    const errors = getShotUpdateErrors({ id: 1, ...data })
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      if (formElement) focusFirstInvalidControl(formElement)
      return
    }

    setIsSubmitting(true)
    try {
      if (targetRecipe) {
        await createShotAndSaveRecipe({
          data: {
            shot: data,
            target:
              targetRecipe.kind === 'new'
                ? { name: targetRecipe.name }
                : { recipeId: targetRecipe.recipeId },
          },
        })
      } else {
        await createShot({ data })
      }
      setIsDirty(false)
      await onSaved()
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

  const handleRecipeSubmit = async (target: SaveToRecipeTarget) => {
    await saveShot(target)
    // A successful save navigates away, so the dialog never closes itself.
    return false
  }

  const beanOptions = beans
  const selectedBean = beanOptions.find(
    (bean) => String(bean.purchaseId) === values.beanPurchaseId,
  )
  const gearOptions = availableGearForShot(values, gear)
  const availableRecipes = recipes.filter(
    (recipe) => String(recipe.brewingMethodId) === values.brewingMethodId,
  )
  const flavorTags = tasteTags.filter(
    (tag) => !isLegacySensoryTasteTag(tag) || selectedTags.includes(tag.id),
  )
  const featuredTagIds = [
    ...tasteTagSuggestions.map((suggestion) => suggestion.id),
    ...flavorTags.map((tag) => tag.id),
  ]
    .filter((id, index, ids) => ids.indexOf(id) === index)
    .slice(0, FREQUENT_TASTE_TAG_LIMIT)
  const showSensoryRatings = enabledSensoryRatingKeys(tasteProfile).length > 0
  const showExtractionBalance = tasteProfile.extractionBalance
  const recommendationRequest = newShotRecommendationRequest(values)
  const canSave = Boolean(values.brewingMethodId) && !isSubmitting
  const saveToRecipeDialog = (trigger: ReactElement) => (
    <SaveToRecipeDialog
      trigger={trigger}
      triggerLabel="Save into recipe"
      title="Save brew into a recipe"
      description="Save the brew and store its final bean, equipment, and brewing values in a new or existing recipe."
      availableRecipes={availableRecipes}
      defaultRecipeId={selectedRecipe?.id}
      defaultRecipeHint="loaded"
      nameLabel="New recipe name"
      submitLabel="Save brew and recipe"
      isSubmitting={isSubmitting}
      onSubmit={handleRecipeSubmit}
    />
  )

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"
    >
      {hasShotTimer && timer.running && !inlineTimerVisible ? (
        <ShotTimerStickyBar
          timer={timer}
          className="fixed inset-x-4 top-[calc(3.5rem+0.75rem)] z-40 lg:hidden"
        />
      ) : null}
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
              label="Load recipe template"
              value={loadedRecipeId}
              items={availableRecipes}
              suggestions={availableRecipes.slice(0, 5)}
              getKey={({ id }) => id}
              getLabel={({ name }) => name}
              onChange={loadRecipe}
              placeholder="Choose a recipe template"
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
        <FormSection
          title="Beans"
          description="Choose the beans for this brew."
        >
          <BeanPicker
            id="bean"
            label="Bean"
            value={values.beanPurchaseId}
            onChange={(beanPurchaseId) => {
              const selected = beanOptions.find(
                (bean) => String(bean.purchaseId) === beanPurchaseId,
              )
              setValues((current) => ({
                ...current,
                beanId: selected ? String(selected.id) : '',
                beanPurchaseId: beanPurchaseId ?? '',
              }))
              setIsDirty(true)
            }}
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
        <FormSection
          title="Drink type"
          description="Choose the finished drink for this brew."
        >
          <DrinkSelectionFields
            configuration={availableDrinks}
            suggestions={drinkTypeSuggestions.filter((suggestion) =>
              availableDrinks.drinkTypes.some(
                (type) => type.id === suggestion.id,
              ),
            )}
            values={values}
            onChange={(next) => {
              set('drinkTypeId', next.drinkTypeId)
              set('drinkOptionValueIds', next.drinkOptionValueIds)
            }}
          />
        </FormSection>
        <ShotParameterFields
          values={values}
          gear={gearOptions}
          enabledParameters={selectedMethod?.enabledParameters ?? []}
          equipmentPresetField={
            selectedMethod && gearSets.length > 0 ? (
              <GearSetPicker
                id="shot-gear-set"
                value={gearSetId}
                gearSets={gearSets}
                onChange={loadGearSet}
              />
            ) : undefined
          }
          beforeExtraction={
            hasShotTimer ? (
              // Phones get the timer next to the brew-time field it fills
              // in; desktop keeps it in the pinned sidebar instead.
              <div ref={inlineTimerRef} className="lg:hidden">
                <ShotTimer timer={timer} />
              </div>
            ) : undefined
          }
          useEquipmentSetupDefaults
          errors={fieldErrors}
          onChange={set}
        />
        {hasEnabledTasteProfileField(tasteProfile) ? (
          <FormSection
            title="Taste profile"
            description="Rate the result once you have tasted it."
            collapsible
            defaultOpen={false}
          >
            {tasteProfile.overallRating ||
            showSensoryRatings ||
            showExtractionBalance ? (
              <div className="space-y-1">
                {tasteProfile.overallRating ? (
                  <div className="space-y-1">
                    <span className="block text-sm font-medium">
                      Overall rating
                    </span>
                    <StarRating
                      value={values.rating}
                      onChange={(rating) => set('rating', rating)}
                      sizeClassName="size-5"
                      ariaLabel="Brew rating"
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
                featuredIds={featuredTagIds}
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
      {/* The height cap keeps the save buttons reachable on short windows:
          a pinned sidebar taller than the viewport never scrolls its tail
          into view, so it scrolls internally instead. */}
      <aside className="order-2 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
        {selectedBean ? (
          <div className="hidden lg:block">
            <BeanCard bean={selectedBean} />
          </div>
        ) : null}
        {hasShotTimer ? (
          <ShotTimer timer={timer} className="hidden lg:flex" />
        ) : null}
        <AiRecommendationDialog
          enabled={recommendationEnabled}
          request={recommendationRequest}
          size="lg"
          className="w-full"
          showDisabledReason
        />
        <div className="hidden space-y-4 lg:block">
          {saveToRecipeDialog(
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={!canSave}
            />,
          )}
          <Button
            type="submit"
            size="lg"
            disabled={!canSave}
            aria-busy={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Saving…' : 'Save brew'}
          </Button>
        </div>
      </aside>
      {/* Phones keep the save actions within thumb reach above the tab bar
          instead of at the end of a page several screens tall. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 order-3 -mx-4 flex gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8 lg:hidden">
        {saveToRecipeDialog(
          <Button
            type="button"
            variant="outline"
            className="min-w-0 flex-1 px-3"
            disabled={!canSave}
          />,
        )}
        <Button
          type="submit"
          disabled={!canSave}
          aria-busy={isSubmitting}
          className="min-w-0 flex-1 px-3"
        >
          {isSubmitting ? 'Saving…' : 'Save brew'}
        </Button>
      </div>
    </form>
  )
}
