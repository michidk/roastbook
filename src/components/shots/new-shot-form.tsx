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
import { ShottimerShotDialog } from '@/components/shots/shottimer-shot-dialog'
import { TasteTagSelector } from '@/components/shots/taste-tag-selector'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StarRating } from '@/components/ui/star-rating'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import {
  useCurrentLocalDateTimeLimit,
  useLocalDateTimeInput,
} from '@/hooks/use-local-date-time-input'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useTasteProfile } from '@/hooks/use-taste-profile'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { DEMO_MODE } from '@/lib/build-mode'
import {
  type DrinkConfiguration,
  drinkConfigurationForBrewingMethod,
  drinkSelectionForConfiguration,
} from '@/lib/drink-options'
import { focusFirstInvalidControl } from '@/lib/form-validation'
import { beanSelectionForBrewingMethod } from '@/lib/new-shot-defaults'
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
  updateShot,
} from '@/lib/server/shots'
import type {
  getBeanSuggestions,
  getBrewingMethodSuggestions,
  getDrinkTypeSuggestions,
  getLastBeansByBrewingMethod,
  getTasteTagSuggestions,
} from '@/lib/server/suggestions'
import type { getTasteTags } from '@/lib/server/taste-tags'
import { SHOT_SENSORY_RATING_KEYS } from '@/lib/shot-sensory'
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
  matchingGearSetId,
  type ShotFormValues,
  shotFormValuesFrom,
  shotFormValuesWithGearSet,
  shotFormValuesWithRecipe,
} from '@/modules/brews/shot-form-values'
import { enqueueBrewSaveToRecipe } from '@/modules/offline/entity-operations'
import { isNetworkError } from '@/modules/offline/errors'
import {
  enqueuePendingBrew,
  updateQueuedBrewPayload,
} from '@/modules/offline/pending-store'
import { requestPendingSync } from '@/modules/offline/sync-trigger'
import {
  holdPendingBrewForTasting,
  releasePendingBrewForTasting,
} from '@/modules/offline/tasting-holds'
import type { PendingBrewPayload } from '@/modules/offline/types'

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
  readonly shottimerEnabled: boolean
  readonly defaultBrewedAt: string
  readonly offlineSnapshotSavedAt?: string
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
  /** Called after the brew was queued on this device, before the form unmounts. */
  readonly onQueued: () => Promise<void>
}

function requestedBeanSelection(
  beans: NewShotFormData['beans'],
  initialBean: NewShotFormProps['initialBean'],
) {
  if (!initialBean) return undefined
  const requested =
    beans.find((bean) => bean.purchaseId === initialBean.beanPurchaseId) ??
    beans.find((bean) => bean.id === initialBean.beanId)
  return requested
    ? {
        beanId: String(requested.id),
        beanPurchaseId: String(requested.purchaseId),
      }
    : undefined
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

/** What the tasting step edits; everything else stays as the brew was saved. */
function tastingValues(values: ShotFormValues) {
  const { rating, extractionBalance, notes } = values
  return {
    rating,
    extractionBalance,
    notes,
    ...Object.fromEntries(
      SHOT_SENSORY_RATING_KEYS.map((key) => [key, values[key]]),
    ),
  }
}

export function NewShotForm({
  data,
  initialBean,
  onSaved,
  onQueued,
}: NewShotFormProps) {
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
    shottimerEnabled,
    defaultBrewedAt,
    offlineSnapshotSavedAt,
  } = data
  const tasteProfile = useTasteProfile()
  const isOnline = useOnlineStatus()
  const formatDateTime = useDateTimeFormatter()
  const [values, setValues] = useState<ShotFormValues>(() => {
    const brewingMethodId = brewingMethodSuggestions[0]
      ? String(brewingMethodSuggestions[0].id)
      : ''
    return {
      ...EMPTY_SHOT_FORM_VALUES,
      brewingMethodId,
      ...beanSelectionForBrewingMethod(
        lastBeansByBrewingMethod,
        brewingMethodId,
        requestedBeanSelection(beans, initialBean),
      ),
    }
  })
  const [hasChosenBean, setHasChosenBean] = useState(
    () => requestedBeanSelection(beans, initialBean) !== undefined,
  )
  const [loadedRecipeId, setLoadedRecipeId] = useState('')
  const [brewedAt, setBrewedAt] = useLocalDateTimeInput(defaultBrewedAt)
  const latestBrewedAt = useCurrentLocalDateTimeLimit()
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingLastShot, setIsLoadingLastShot] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<
    Readonly<Record<string, string>>
  >({})
  const [isDirty, setIsDirty] = useState(false)
  const operationIdRef = useRef<string | null>(null)
  // The saved or queued brew the tasting dialog completes, with its saved values.
  const [tasting, setTasting] = useState<
    | {
        readonly kind: 'saved'
        readonly id: number
        readonly values: ShotFormValues
      }
    | {
        readonly kind: 'pending'
        readonly operationId: string
        readonly values: ShotFormValues
      }
    | null
  >(null)
  const [timerKey, setTimerKey] = useState(0)
  const [inlineTimerVisible, setInlineTimerVisible] = useState(true)
  const isInitializing = useRef(true)
  const inlineTimerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    isInitializing.current = false
  }, [])

  useUnsavedChanges(isDirty && !isSubmitting)

  useEffect(() => {
    return () => {
      if (tasting?.kind === 'pending') {
        releasePendingBrewForTasting(tasting.operationId)
      }
    }
  }, [tasting])

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
        ...beanSelectionForBrewingMethod(
          lastBeansByBrewingMethod,
          brewingMethodId,
          hasChosenBean
            ? { beanId: current.beanId, beanPurchaseId: current.beanPurchaseId }
            : undefined,
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
    if (DEMO_MODE) {
      toast.info('Demo mode is read-only. Changes are disabled.')
      return false
    }

    const timerValue = hasShotTimer ? timer.getValue() : undefined
    const submittedValues =
      timerValue === undefined
        ? values
        : { ...values, shotTimeSeconds: timerValue }
    const baseData = newShotPayload(submittedValues, selectedTags, {
      brewedAt,
    })
    const errors = getShotUpdateErrors({ id: 1, ...baseData })
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      if (formElement) focusFirstInvalidControl(formElement)
      return false
    }

    const operationId = operationIdRef.current ?? crypto.randomUUID()
    operationIdRef.current = operationId

    const enqueueBrew = async () => {
      const payload: PendingBrewPayload = {
        ...baseData,
        clientOperationId: operationId,
      }
      const brewedAtValue =
        baseData.brewedAt instanceof Date
          ? baseData.brewedAt.toISOString()
          : new Date().toISOString()
      const shouldHoldForTasting = hasEnabledTasteProfileField(tasteProfile)

      if (shouldHoldForTasting) holdPendingBrewForTasting(operationId)

      try {
        await enqueuePendingBrew({
          operationId,
          payload,
          summary: {
            beanName: selectedBean?.name ?? null,
            methodName: selectedMethod?.name ?? 'Brew',
            brewedAt: brewedAtValue,
            doseGrams: baseData.doseGrams ?? null,
            yieldGrams: baseData.yieldGrams ?? null,
            shotTimeSeconds: baseData.shotTimeSeconds ?? null,
          },
          createdAt: new Date().toISOString(),
          attempts: 0,
          status: 'pending',
        })
      } catch (error) {
        if (shouldHoldForTasting) {
          releasePendingBrewForTasting(operationId)
        }
        throw error
      }

      operationIdRef.current = null
      setIsDirty(false)
      // The tasting step is part of the core workflow, so keep it available
      // for a queued brew too. It updates the queued payload in place.
      if (shouldHoldForTasting) {
        setTasting({ kind: 'pending', operationId, values: submittedValues })
      } else {
        await onQueued()
      }
      return true
    }

    const enqueueSaveToRecipe = async (target: SaveToRecipeTarget) => {
      await enqueueBrewSaveToRecipe(
        operationId,
        {
          shot: { ...baseData, clientOperationId: operationId },
          target:
            target.kind === 'new'
              ? { name: target.name }
              : { recipeId: target.recipeId },
        },
        {
          label: selectedBean?.name ?? 'Brew',
          detail:
            target.kind === 'new'
              ? `New recipe: ${target.name}`
              : 'Existing recipe',
        },
      )
      operationIdRef.current = null
      setIsDirty(false)
      toast.success(
        'Saved on this device. The brew and recipe will sync when you reconnect.',
      )
      await onQueued()
      return true
    }

    setIsSubmitting(true)
    try {
      if (!isOnline) {
        return targetRecipe
          ? await enqueueSaveToRecipe(targetRecipe)
          : await enqueueBrew()
      }

      const shot = targetRecipe
        ? (
            await createShotAndSaveRecipe({
              data: {
                shot: { ...baseData, clientOperationId: operationId },
                target:
                  targetRecipe.kind === 'new'
                    ? { name: targetRecipe.name }
                    : { recipeId: targetRecipe.recipeId },
              },
            })
          ).shot
        : await createShot({
            data: { ...baseData, clientOperationId: operationId },
          })

      operationIdRef.current = null
      setIsDirty(false)
      // Tasting comes after the brew is saved, as an optional second step.
      if (hasEnabledTasteProfileField(tasteProfile))
        setTasting({ kind: 'saved', id: shot.id, values: submittedValues })
      else await onSaved()
      return true
    } catch (error) {
      if (isNetworkError(error) || !navigator.onLine) {
        try {
          return targetRecipe
            ? await enqueueSaveToRecipe(targetRecipe)
            : await enqueueBrew()
        } catch (queueError) {
          toast.error(
            queueError instanceof Error
              ? queueError.message
              : 'Could not save this brew on this device',
          )
          return false
        }
      }

      toast.error(
        error instanceof Error ? error.message : 'Could not save this brew',
      )
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  // Saves the tasting onto the brew just created, or updates the queued payload.
  const saveTasting = async () => {
    if (!tasting) return
    setIsSubmitting(true)
    try {
      const data = newShotPayload(
        { ...tasting.values, ...tastingValues(values) },
        selectedTags,
        { brewedAt },
      )

      if (tasting.kind === 'saved') {
        await updateShot({ data: { id: tasting.id, ...data } })
        await onSaved()
      } else {
        await updateQueuedBrewPayload(tasting.operationId, {
          ...data,
          clientOperationId: tasting.operationId,
        })
        releasePendingBrewForTasting(tasting.operationId)
        requestPendingSync()
        await onQueued()
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save the tasting',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const finishWithoutTasting = () => {
    if (tasting?.kind === 'pending') {
      releasePendingBrewForTasting(tasting.operationId)
      requestPendingSync()
      void onQueued()
      return
    }
    void onSaved()
  }

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    await saveShot(null, event.currentTarget)
  }

  // Closes once the brew is saved, so the tasting dialog can take over.
  const handleRecipeSubmit = (target: SaveToRecipeTarget) => saveShot(target)

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
      {shottimerEnabled &&
      isOnline &&
      selectedMethod?.enabledParameters.includes('shotTimeSeconds') ? (
        <ShottimerShotDialog
          targetTimeSeconds={values.targetTimeSeconds}
          onAccept={(seconds) => {
            set('shotTimeSeconds', seconds)
            // Stops a running manual timer so it shows the accepted time.
            setTimerKey((current) => current + 1)
          }}
        />
      ) : null}
      {hasShotTimer && timer.running && !inlineTimerVisible ? (
        <ShotTimerStickyBar
          timer={timer}
          className="fixed inset-x-4 top-[calc(3.5rem+0.75rem)] z-40 lg:hidden"
        />
      ) : null}
      <div className="space-y-5">
        {!isOnline || offlineSnapshotSavedAt ? (
          <div
            role="status"
            className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
          >
            <p className="font-semibold">Offline mode</p>
            <p className="mt-1">
              Brews saved now stay on this device and sync when you reconnect.
              {offlineSnapshotSavedAt
                ? ` Using lists saved ${formatDateTime(offlineSnapshotSavedAt)}.`
                : ''}
            </p>
          </div>
        ) : null}
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
              setHasChosenBean(Boolean(beanPurchaseId))
              setIsDirty(true)
            }}
            beans={beanOptions}
            suggestions={beanSuggestions}
          />
          {selectedBean ? (
            <Button
              type="button"
              variant="outline"
              disabled={isLoadingLastShot || !isOnline}
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
                value={matchingGearSetId(values, gearSets)}
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
          enabled={recommendationEnabled && isOnline}
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
          instead of at the end of a page several screens tall. The bar runs
          2rem further down, behind the tab bar, so at the end of the page it
          also covers the strip of bottom padding the tab bar leaves open. */}
      <div className="sticky bottom-[calc(2rem+env(safe-area-inset-bottom))] z-20 order-3 -mx-4 -mb-8 flex gap-2 border-t border-border bg-card/95 px-4 pt-3 pb-11 backdrop-blur md:-mx-8 md:px-8 lg:hidden">
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
      <Dialog
        open={tasting !== null}
        onOpenChange={(open) => {
          // Closing without saving keeps the brew as it is.
          if (!open && !isSubmitting) finishWithoutTasting()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How did it taste?</DialogTitle>
            <DialogDescription>
              {tasting?.kind === 'pending'
                ? 'The brew is saved on this device. Add a tasting now, or skip and add it later after it syncs.'
                : 'The brew is saved. Add a tasting now, or skip and add it later from the brew.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {tasteProfile.overallRating ||
            showSensoryRatings ||
            showExtractionBalance ? (
              <div className="space-y-3">
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
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={finishWithoutTasting}
            >
              Skip
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              onClick={() => void saveTasting()}
            >
              {isSubmitting ? 'Saving…' : 'Save tasting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
