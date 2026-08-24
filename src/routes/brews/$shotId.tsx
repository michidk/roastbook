import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { EntityNotFound } from '@/components/entity-not-found'
import { Page, PageHeader } from '@/components/page-layout'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { ExtractionBalanceField } from '@/components/shots/extraction-balance-field'
import {
  SaveToRecipeDialog,
  type SaveToRecipeTarget,
} from '@/components/shots/save-to-recipe-dialog'
import { ShotEditForm } from '@/components/shots/shot-edit-form'
import { ShotSensoryRatingFields } from '@/components/shots/shot-sensory-ratings'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { StarRating } from '@/components/ui/star-rating'
import { useDateTimeFormatter } from '@/hooks/use-date-formatter'
import { useNumberFormatter } from '@/hooks/use-number-formatter'
import { useTasteProfile } from '@/hooks/use-taste-profile'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { getErrorMessage } from '@/lib/error-message'
import { hasExtractionBalance } from '@/lib/extraction-balance'
import { parseIdParam } from '@/lib/route-params'
import { searchValidator } from '@/lib/search-params'
import { getActiveBeans } from '@/lib/server/beans'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getGear } from '@/lib/server/gear'
import { getRecipeOptions, saveShotAsRecipe } from '@/lib/server/recipes'
import { deleteShot, getShot } from '@/lib/server/shots'
import { getTasteTags } from '@/lib/server/taste-tags'
import {
  hasShotSensoryRatings,
  shotSensoryRatingsFrom,
} from '@/lib/shot-sensory'
import { enabledSensoryRatingKeys } from '@/lib/taste-profile'
import { isNegativeTasteTag } from '@/lib/taste-tags'

export const Route = createFileRoute('/brews/$shotId')({
  validateSearch: searchValidator(parseEditModeSearch),
  loaderDeps: ({ search }) => ({ edit: search.edit ?? false }),
  loader: async ({ params, deps }) => {
    const shotId = parseIdParam(params.shotId)
    const [shot, recipes, editData] = await Promise.all([
      getShot({ data: shotId }),
      getRecipeOptions(),
      deps.edit
        ? Promise.all([
            getActiveBeans(),
            getTasteTags(),
            getGear(),
            getBrewingMethods(),
          ]).then(([beans, tasteTags, gear, methods]) => ({
            beans,
            tasteTags,
            gear,
            methods,
          }))
        : null,
    ])
    return { shot, recipes, editData }
  },
  component: ShotDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/brews" backLabel="Back to brews" />
  ),
})

function ShotDataFields({
  fields,
  valueClassName,
}: {
  readonly fields: readonly { readonly label: string; readonly value: string }[]
  readonly valueClassName: string
}) {
  return fields.map((field) => (
    <div key={field.label}>
      <p className="text-sm text-muted-foreground">{field.label}</p>
      <p className={valueClassName}>{field.value}</p>
    </div>
  ))
}

function ShotDetailPage() {
  const formatDateTime = useDateTimeFormatter()
  const { shot, recipes, editData } = Route.useLoaderData()
  const { edit: isEditing = false } = Route.useSearch()
  const formatNumber = useNumberFormatter()
  const tasteProfile = useTasteProfile()
  const navigate = useNavigate({ from: '/brews/$shotId' })
  const router = useRouter()

  const [isSavingRecipe, setIsSavingRecipe] = useState(false)
  const editButtonRef = useRef<HTMLAnchorElement>(null)

  if (!shot) {
    return (
      <EntityNotFound entity="Brew" backTo="/brews" backLabel="Back to brews" />
    )
  }

  const handleDelete = async () => {
    try {
      await deleteShot({ data: shot.id })
      await router.invalidate()
      await navigate({ to: '/brews' })
    } catch {
      toast.error('Failed to delete brew')
    }
  }

  const handleCancel = () => {
    void navigate({ search: (current) => ({ ...current, edit: undefined }) })
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  const handleSaved = async () => {
    await router.invalidate()
    await navigate({ search: (current) => ({ ...current, edit: undefined }) })
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }

  const handleSaveRecipe = async (target: SaveToRecipeTarget) => {
    const isNewRecipe = target.kind === 'new'
    setIsSavingRecipe(true)
    try {
      const recipe = await saveShotAsRecipe({
        data: isNewRecipe
          ? { shotId: shot.id, name: target.name }
          : { shotId: shot.id, recipeId: target.recipeId },
      })
      if (!recipe) {
        toast.error('Could not save this recipe')
        return false
      }
      await router.invalidate()
      toast.success(isNewRecipe ? 'Recipe created' : 'Recipe updated')
      return true
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save this recipe'))
      return false
    } finally {
      setIsSavingRecipe(false)
    }
  }

  const ratioNumerator =
    shot.ratioBasis === 'brew_water' ? shot.brewWaterGrams : shot.yieldGrams
  const ratio =
    shot.doseGrams && ratioNumerator
      ? (Number(ratioNumerator) / Number(shot.doseGrams)).toFixed(1)
      : null
  const methodParameters = shot.brewingMethod.enabledParameters

  const extractionMetrics = [
    methodParameters.includes('doseGrams') && shot.doseGrams
      ? { label: 'Dose', value: `${formatNumber(shot.doseGrams)} g` }
      : null,
    methodParameters.includes('yieldGrams') && shot.yieldGrams
      ? { label: 'Yield', value: `${formatNumber(shot.yieldGrams)} g` }
      : null,
    methodParameters.includes('yieldGrams') && ratio
      ? { label: 'Ratio', value: `1:${formatNumber(ratio)}` }
      : null,
    methodParameters.includes('shotTimeSeconds') &&
    shot.shotTimeSeconds !== null
      ? { label: 'Time', value: `${formatNumber(shot.shotTimeSeconds)} s` }
      : null,
  ].filter((field) => field !== null)
  const extractionDetails = [
    methodParameters.includes('grindSetting') && shot.grindSetting?.trim()
      ? { label: 'Grind', value: shot.grindSetting }
      : null,
    methodParameters.includes('brewTemperatureCelsius') &&
    shot.brewTemperatureCelsius
      ? {
          label: 'Temperature',
          value: `${formatNumber(shot.brewTemperatureCelsius)} °C`,
        }
      : null,
    methodParameters.includes('brewPressureBar') && shot.brewPressureBar
      ? {
          label: 'Pressure',
          value: `${formatNumber(shot.brewPressureBar)} bar`,
        }
      : null,
  ].filter((field) => field !== null)
  const hasRating = tasteProfile.overallRating && Boolean(shot.rating)
  const hasTasteTags = tasteProfile.flavorTags && shot.tasteTags.length > 0
  const hasNotes = tasteProfile.notes && Boolean(shot.notes?.trim())
  const sensoryRatings = shotSensoryRatingsFrom(shot)
  const hasSensoryRatings = hasShotSensoryRatings(
    shot,
    enabledSensoryRatingKeys(tasteProfile),
  )
  const hasBalance =
    tasteProfile.extractionBalance &&
    hasExtractionBalance(shot.extractionBalance)
  const hasTasting =
    hasRating || hasSensoryRatings || hasBalance || hasTasteTags || hasNotes
  const availableRecipes = recipes.filter(
    (recipe) => recipe.brewingMethodId === shot.brewingMethodId,
  )

  return (
    <Page width="form">
      <PageHeader
        size="compact"
        title={shot.bean?.name || 'Unknown beans'}
        description={
          <time dateTime={new Date(shot.brewedAt).toISOString()}>
            {shot.brewingMethod.name} · {formatDateTime(shot.brewedAt)}
          </time>
        }
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/brews" aria-label="Back to brews">
              <ArrowLeft aria-hidden className="h-4 w-4" />
            </Link>
          </Button>
        }
        actions={
          <>
            {!isEditing && (
              <>
                <SaveToRecipeDialog
                  trigger={<Button variant="outline" size="sm" />}
                  triggerLabel="Save to recipe"
                  title="Save shot values to a recipe"
                  description="Save this brew’s method, equipment, and recipe values for reuse."
                  availableRecipes={availableRecipes}
                  currentRecipeId={shot.recipe?.id}
                  currentRecipeHint="used for this shot"
                  nameLabel="Recipe name"
                  submitLabel="Create recipe"
                  updateSubmitLabel="Update recipe"
                  isSubmitting={isSavingRecipe}
                  onSubmit={handleSaveRecipe}
                />
                <Button variant="outline" size="sm" asChild>
                  <Link
                    ref={editButtonRef}
                    to="/brews/$shotId"
                    params={{ shotId: String(shot.id) }}
                    search={(current) => ({ ...current, edit: true })}
                  >
                    <Pencil />
                    Edit
                  </Link>
                </Button>
              </>
            )}
            <DeleteConfirmation
              title="Delete this brew?"
              description="This action cannot be undone."
              onConfirm={handleDelete}
            />
          </>
        }
      />

      {shot.recipe ? (
        <p className="-mt-4 text-sm text-muted-foreground">
          Brewed from{' '}
          <Link
            to="/recipes/$recipeId"
            params={{ recipeId: String(shot.recipe.id) }}
            className="inline-flex min-h-11 items-center rounded-md font-semibold text-link hover:underline [@media(hover:hover)_and_(pointer:fine)]:min-h-0"
          >
            {shot.recipe.name}
          </Link>
        </p>
      ) : null}

      {isEditing && editData ? (
        <ShotEditForm
          shot={shot}
          editData={editData}
          onCancel={handleCancel}
          onSaved={handleSaved}
        />
      ) : (
        <>
          {(extractionMetrics.length > 0 || extractionDetails.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle as="h2">Extraction</CardTitle>
              </CardHeader>
              <CardContent>
                {extractionMetrics.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <ShotDataFields
                      fields={extractionMetrics}
                      valueClassName="text-xl font-semibold"
                    />
                  </div>
                )}

                {extractionMetrics.length > 0 &&
                  extractionDetails.length > 0 && (
                    <Separator className="my-4" />
                  )}

                {extractionDetails.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <ShotDataFields
                      fields={extractionDetails}
                      valueClassName="font-medium"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {hasTasting && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle as="h2">Tasting</CardTitle>
                  {hasRating && shot.rating ? (
                    <StarRating value={shot.rating} variant="compact" />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasSensoryRatings ? (
                  <ShotSensoryRatingFields values={sensoryRatings} readOnly />
                ) : null}

                {hasBalance ? (
                  <ExtractionBalanceField
                    value={shot.extractionBalance ?? 0}
                    readOnly
                  />
                ) : null}

                {hasTasteTags && (
                  <div className="flex flex-wrap gap-2">
                    {shot.tasteTags.map((tt) => (
                      <Badge
                        key={tt.id}
                        title={tt.tasteTag.hint ?? undefined}
                        variant={
                          isNegativeTasteTag(tt.tasteTag)
                            ? 'destructive'
                            : 'default'
                        }
                      >
                        {tt.tasteTag.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {hasNotes && (
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap">{shot.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Page>
  )
}
